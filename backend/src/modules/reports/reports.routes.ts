import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";

const router = Router();
router.use(requireAuth);

// Construye el libro de movimientos combinando Caja y Banco (ahora que no
// existe Tesorería como sección aparte, esto ES la contabilidad de la
// asociación) y calcula el saldo acumulado tras cada uno.
async function buildLedger(from?: string, to?: string) {
  const dateFilterCash = {
    createdAt: {
      gte: from ? new Date(String(from)) : undefined,
      lte: to ? new Date(`${to}T23:59:59`) : undefined,
    },
  };
  const dateFilterBank = {
    date: {
      gte: from ? new Date(String(from)) : undefined,
      lte: to ? new Date(`${to}T23:59:59`) : undefined,
    },
  };

  const [cashMovements, bankMovements] = await Promise.all([
    prisma.cashMovement.findMany({
      where: dateFilterCash,
      include: { createdBy: { select: { fullName: true } }, cashRegister: { select: { name: true } } },
    }),
    prisma.bankMovement.findMany({
      where: dateFilterBank,
      include: { bankAccount: { select: { name: true } } },
    }),
  ]);

  const rows = [
    ...cashMovements.map((m) => ({
      date: m.createdAt,
      concept: m.concept,
      source: `Caja (${m.cashRegister.name})`,
      type: m.type,
      amount: Number(m.amount),
      user: m.createdBy.fullName,
    })),
    ...bankMovements.map((m) => ({
      date: m.date,
      concept: m.concept,
      source: `Banco (${m.bankAccount.name})`,
      type: m.type,
      amount: Number(m.amount),
      user: null as string | null,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Saldo inicial: la suma de los saldos iniciales de las cuentas bancarias
  // (la caja siempre arranca en 0). A partir de ahí se acumula movimiento
  // a movimiento en orden cronológico.
  const bankAccounts = await prisma.bankAccount.findMany({ select: { initialBalance: true } });
  let runningBalance = bankAccounts.reduce((acc, b) => acc + Number(b.initialBalance), 0);

  const ledger = rows.map((r) => {
    runningBalance += r.type === "in" ? r.amount : -r.amount;
    return {
      date: r.date,
      concept: r.concept,
      source: r.source,
      user: r.user,
      income: r.type === "in" ? r.amount : 0,
      expense: r.type === "out" ? r.amount : 0,
      balance: runningBalance,
    };
  });

  const totalIncome = ledger.reduce((acc, r) => acc + r.income, 0);
  const totalExpenses = ledger.reduce((acc, r) => acc + r.expense, 0);

  return { ledger, totalIncome, totalExpenses, finalBalance: runningBalance };
}

router.get("/balance", requirePermission("reports.read"), async (req, res) => {
  const { from, to } = req.query;
  const { totalIncome, totalExpenses, finalBalance } = await buildLedger(from as string, to as string);
  res.json({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses, finalBalance });
});

// Devuelve el libro completo con las tres columnas (ingresos, gastos, saldo
// tras cada movimiento) para mostrarlo en la tabla de Informes.
router.get("/ledger", requirePermission("reports.read"), async (req, res) => {
  const { from, to } = req.query;
  const { ledger, totalIncome, totalExpenses, finalBalance } = await buildLedger(from as string, to as string);
  res.json({ ledger, totalIncome, totalExpenses, finalBalance });
});

router.get("/sales", requirePermission("reports.read"), async (_req, res) => {
  const items = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, subtotal: true },
  });
  res.json(items);
});

router.get("/export", requirePermission("reports.read"), async (req, res, next) => {
  try {
    const { format, from, to } = req.query;
    const { ledger } = await buildLedger(from as string, to as string);

    const rows = ledger.map((r) => ({
      fecha: r.date,
      concepto: r.concept,
      origen: r.source,
      ingreso: r.income,
      gasto: r.expense,
      saldo: r.balance,
      usuario: r.user || "",
    }));

    if (format === "csv") {
      const header = "Fecha,Concepto,Origen,Ingreso,Gasto,Saldo,Usuario";
      const lines = rows.map((r) =>
        [
          r.fecha.toISOString().slice(0, 10),
          `"${r.concepto}"`,
          r.origen,
          r.ingreso.toFixed(2),
          r.gasto.toFixed(2),
          r.saldo.toFixed(2),
          r.usuario,
        ].join(",")
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
        { header: "Fecha", key: "fecha", width: 12 },
        { header: "Concepto", key: "concepto", width: 30 },
        { header: "Origen", key: "origen", width: 20 },
        { header: "Ingreso", key: "ingreso", width: 12 },
        { header: "Gasto", key: "gasto", width: 12 },
        { header: "Saldo", key: "saldo", width: 12 },
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
      doc.fontSize(9);

      rows.forEach((r) => {
        doc.text(
          `${r.fecha.toISOString().slice(0, 10)}  ${r.concepto.slice(0, 28).padEnd(28)}  +${r.ingreso.toFixed(2)}  -${r.gasto.toFixed(2)}  saldo: ${r.saldo.toFixed(2)} €`
        );
      });

      doc.moveDown();
      const finalBalance = rows.length > 0 ? rows[rows.length - 1].saldo : 0;
      doc.fontSize(12).text(`Saldo final: ${finalBalance.toFixed(2)} €`, { align: "right" });

      doc.end();
      return;
    }

    res.status(400).json({ error: "Formato no soportado. Usa csv, excel o pdf." });
  } catch (err) {
    next(err);
  }
});

export default router;
