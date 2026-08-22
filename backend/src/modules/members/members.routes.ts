import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("members.read"), async (req, res) => {
  const { search, street } = req.query;

  // El número de socio ya no se escribe a mano: se calcula según el orden
  // de alta (el socio 1 es el que más antiguo, y el último número siempre
  // coincide con el total de socios que hay, sin huecos aunque se borre
  // alguno por el medio).
  const allByJoinDate = await prisma.member.findMany({
    select: { id: true },
    orderBy: { joinDate: "asc" },
  });
  const numberById = new Map(allByJoinDate.map((m, i) => [m.id, i + 1]));

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
        error: "Este socio tiene cuotas, donativos o ventas de lotería asociadas. Elimina o desvincula esos registros antes de borrarlo.",
      });
    }
    await prisma.member.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "members", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
