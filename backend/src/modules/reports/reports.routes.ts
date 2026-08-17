import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";

const router = Router();
router.use(requireAuth);

router.get("/balance", requirePermission("reports.read"), async (req, res) => {
  const { from, to } = req.query;
  const where = {
    date: {
      gte: from ? new Date(String(from)) : undefined,
      lte: to ? new Date(String(to)) : undefined,
    },
    voidedAt: null,
  };

  const [income, expenses] = await Promise.all([
    prisma.income.aggregate({ _sum: { amount: true }, where }),
    prisma.expense.aggregate({ _sum: { amount: true }, where }),
  ]);

  const totalIncome = Number(income._sum.amount || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);

  res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses });
});

router.get("/sales", requirePermission("reports.read"), async (_req, res) => {
  const items = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, subtotal: true },
  });
  res.json(items);
});

// Exporta el listado de ingresos y gastos del rango de fechas indicado
// (o de todos si no se indica) en el formato solicitado.
router.get("/export", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const { format, from, to } = req.query;
    const where = {
      date: {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(String(to)) : undefined,
      },
      voidedAt: null,
    };

    const [income, expenses] = await Promise.all([
      prisma.income.findMany({ where, include: { createdBy: { select: { fullName: true } } }, orderBy: { date: "asc" } }),
      prisma.expense.findMany({ where, include: { createdBy: { select: { fullName: true } } }, orderBy: { date: "asc" } }),
    ]);

    const rows = [
      ...income.map((i) => ({ tipo: "Ingreso", fecha: i.date, concepto: i.concept, categoria: i.category, importe: Number(i.amount), usuario: i.createdBy.fullName })),
      ...expenses.map((e) => ({ tipo: "Gasto", fecha: e.date, concepto: e.concept, categoria: e.category, importe: -Number(e.amount), usuario: e.createdBy.fullName })),
    ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    if (format === "csv") {
      const header = "Tipo,Fecha,Concepto,Categoria,Importe,Usuario";
      const lines = rows.map((r) =>
        [r.tipo, r.fecha.toISOString().slice(0, 10), `"${r.concepto}"`, r.categoria || "", r.importe.toFixed(2), r.usuario].join(",")
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=informe.csv");
      res.send([header, ...lines].join("\n"));
      return;
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Informe");
      sheet.columns = [
        { header: "Tipo", key: "tipo", width: 10 },
        { header: "Fecha", key: "fecha", width: 12 },
        { header: "Concepto", key: "concepto", width: 30 },
        { header: "Categoría", key: "categoria", width: 15 },
        { header: "Importe", key: "importe", width: 12 },
        { header: "Usuario", key: "usuario", width: 20 },
      ];
      rows.forEach((r) => sheet.addRow({ ...r, fecha: r.fecha.toISOString().slice(0, 10) }));
      sheet.getRow(1).font = { bold: true };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=informe.xlsx");
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=informe.pdf");
      doc.pipe(res);

      doc.fontSize(16).text("Informe económico", { align: "center" });
      doc.moveDown();
      doc.fontSize(10);

      rows.forEach((r) => {
        doc.text(
          `${r.fecha.toISOString().slice(0, 10)}  ${r.tipo.padEnd(8)}  ${r.concepto.padEnd(30)}  ${r.importe.toFixed(2)} €  (${r.usuario})`
        );
      });

      const total = rows.reduce((acc, r) => acc + r.importe, 0);
      doc.moveDown();
      doc.fontSize(12).text(`Balance total: ${total.toFixed(2)} €`, { align: "right" });

      doc.end();
      return;
    }

    res.status(400).json({ error: "Formato no soportado. Usa csv, excel o pdf." });
  } catch (err) {
    next(err);
  }
});

export default router;
