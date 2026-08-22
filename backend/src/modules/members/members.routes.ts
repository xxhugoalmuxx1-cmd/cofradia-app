import { Router } from "express";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("members.read"), async (req, res) => {
  const { search, street } = req.query;

  // El número de socio ya no se escribe a mano: se calcula según el mismo
  // orden en que se listan (calle y luego apellido), así los números
  // siempre van del 1 al final tal como se ven en pantalla — no según la
  // fecha de alta, que podía dar números "desordenados" al agrupar por calle.
  const allSorted = await prisma.member.findMany({
    select: { id: true },
    orderBy: [{ street: "asc" }, { lastName: "asc" }],
  });
  const numberById = new Map(allSorted.map((m, i) => [m.id, i + 1]));

  const members = await prisma.member.findMany({
    where: {
      street: street ? { equals: String(street), mode: "insensitive" } : undefined,
      ...(search
        ? {
            OR: [
              { firstName: { contains: String(search), mode: "insensitive" } },
              { lastName: { contains: String(search), mode: "insensitive" } },
              { street: { contains: String(search), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ street: "asc" }, { lastName: "asc" }],
  });

  res.json(members.map((m) => ({ ...m, number: numberById.get(m.id) })));
});

// Lista de calles ya usadas por algún socio, para poder ofrecerlas como
// sugerencia al dar de alta o editar uno nuevo (mantiene la escritura
// consistente, ej. "Calle Mayor" siempre igual, sin variantes).
router.get("/streets", requirePermission("members.read"), async (_req, res) => {
  const rows = await prisma.member.findMany({
    where: { street: { not: null } },
    select: { street: true },
    distinct: ["street"],
    orderBy: { street: "asc" },
  });
  res.json(rows.map((r) => r.street).filter(Boolean));
});

// PDF real del listado de socios (no una captura de pantalla): tabla con
// cabecera, agrupado por calle, con el número correlativo de cada socio.
router.get("/export", requirePermission("members.read"), async (_req, res) => {
  const members = await prisma.member.findMany({
    orderBy: [{ street: "asc" }, { lastName: "asc" }],
  });
  const numbered = members.map((m, i) => ({ ...m, number: i + 1 }));

  const grouped = new Map<string, typeof numbered>();
  for (const m of numbered) {
    const key = m.street || "Sin calle";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  }

  const doc = new PDFDocument({ margin: 30, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=listado-socios.pdf");
  doc.pipe(res);

  const pageWidth = doc.page.width - 60;
  const columns = [
    { label: "Nº", width: 40 },
    { label: "Nombre", width: pageWidth - 40 - 130 },
    { label: "Teléfono", width: 130 },
  ];

  function drawTitle() {
    doc.fontSize(16).font("Helvetica-Bold").text("Listado de socios — Purísima", { align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#666666");
    doc.text(`Total: ${numbered.length} socios — ${new Date().toLocaleDateString("es-ES")}`, { align: "center" });
    doc.fillColor("#000000");
    doc.moveDown(0.8);
  }

  function drawColumnHeader() {
    const tableTop = doc.y;
    let x = doc.page.margins.left;
    doc.fontSize(9).font("Helvetica-Bold");
    columns.forEach((col) => {
      doc.rect(x, tableTop, col.width, 20).fill("#6b1530");
      doc.fillColor("#ffffff").text(col.label, x + 4, tableTop + 6, { width: col.width - 8, lineBreak: false });
      x += col.width;
    });
    doc.fillColor("#000000");
    return tableTop + 20;
  }

  function truncateToWidth(text: string, maxWidth: number): string {
    if (doc.widthOfString(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && doc.widthOfString(truncated + "…") > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "…";
  }

  drawTitle();
  const rowHeight = 20;

  for (const [street, list] of grouped) {
    // Un pequeño encabezado de calle, con salto de página si no cabe
    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) {
      doc.addPage();
      drawTitle();
    }
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#6b1530").text(street, doc.page.margins.left, doc.y);
    doc.fillColor("#000000");
    doc.moveDown(0.2);

    let y = drawColumnHeader();
    doc.font("Helvetica").fontSize(9);

    list.forEach((m, i) => {
      if (y > doc.page.height - doc.page.margins.bottom - 25) {
        doc.addPage();
        drawTitle();
        y = drawColumnHeader();
        doc.font("Helvetica").fontSize(9);
      }
      if (i % 2 === 0) {
        doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#f5f5f5");
        doc.fillColor("#000000");
      }
      let x = doc.page.margins.left;
      const cells = [String(m.number), `${m.firstName} ${m.lastName}`, m.phone || ""];
      cells.forEach((cell, idx) => {
        const maxWidth = columns[idx].width - 8;
        doc.text(truncateToWidth(cell, maxWidth), x + 4, y + 6, { width: maxWidth, height: rowHeight - 8, lineBreak: false });
        x += columns[idx].width;
      });
      y += rowHeight;
    });

    doc.y = y + 12;
  }

  doc.end();
});

router.get("/:id", requirePermission("members.read"), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: { fees: true, donations: true, lotterySales: true },
  });
  res.json(member);
});

router.post("/", requirePermission("members.create"), async (req: AuthedRequest, res, next) => {
  try {
    const member = await prisma.member.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "members", recordId: member.id, newValue: req.body });
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("members.update"), async (req: AuthedRequest, res, next) => {
  try {
    const before = await prisma.member.findUnique({ where: { id: req.params.id } });
    const member = await prisma.member.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({
      userId: req.user!.id,
      action: "update",
      module: "members",
      recordId: member.id,
      previousValue: before,
      newValue: req.body,
    });
    res.json(member);
  } catch (err) {
    next(err);
  }
});

// Antes de borrar un socio se comprueba que no tenga cuotas, donativos o
// ventas de lotería asociadas — si las tiene, se pide desvincularlas antes,
// para no perder ese historial económico sin darse cuenta.
router.delete("/:id", requirePermission("members.update"), async (req: AuthedRequest, res, next) => {
  try {
    const [feesCount, donationsCount, lotteryCount] = await Promise.all([
      prisma.fee.count({ where: { memberId: req.params.id } }),
      prisma.donation.count({ where: { memberId: req.params.id } }),
      prisma.lotterySale.count({ where: { memberId: req.params.id } }),
    ]);
    if (feesCount + donationsCount + lotteryCount > 0) {
      return res.status(409).json({
        error: "Este socio tiene cuotas, donativos o ventas de lotería asociadas. Elimina o desvincula esos registros antes de borrarlo, o borra directamente toda su calle.",
      });
    }
    await prisma.member.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "members", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Borra TODA una calle, con todos sus socios dentro — a diferencia del
// borrado individual, aquí sí se arrastran también sus cuotas (se borran)
// y se desvinculan sus donativos/lotería (esos registros económicos se
// conservan, simplemente dejan de estar ligados a un socio ya borrado).
router.delete("/street/:street", requirePermission("members.update"), async (req: AuthedRequest, res, next) => {
  try {
    const street = req.params.street;
    const members = await prisma.member.findMany({ where: { street }, select: { id: true } });
    const ids = members.map((m) => m.id);

    if (ids.length === 0) {
      return res.status(404).json({ error: "No hay socios en esa calle" });
    }

    await prisma.$transaction([
      prisma.fee.deleteMany({ where: { memberId: { in: ids } } }),
      prisma.donation.updateMany({ where: { memberId: { in: ids } }, data: { memberId: null } }),
      prisma.lotterySale.updateMany({ where: { memberId: { in: ids } }, data: { memberId: null } }),
      prisma.member.deleteMany({ where: { id: { in: ids } } }),
    ]);

    await logAudit({ userId: req.user!.id, action: "delete_street", module: "members", recordId: street, newValue: { count: ids.length } });
    res.json({ ok: true, deleted: ids.length });
  } catch (err) {
    next(err);
  }
});

export default router;
