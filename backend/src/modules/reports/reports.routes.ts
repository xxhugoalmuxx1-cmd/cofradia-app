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
        { header: "Concepto", key: "concepto", width: 32 },
        { header: "Origen", key: "origen", width: 20 },
        { header: "Ingreso", key: "ingreso", width: 14 },
        { header: "Gasto", key: "gasto", width: 14 },
        { header: "Saldo", key: "saldo", width: 14 },
        { header: "Usuario", key: "usuario", width: 20 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B1530" } };
      headerRow.alignment = { vertical: "middle" };

      rows.forEach((r, i) => {
        const row = sheet.addRow({ ...r, fecha: r.fecha.toISOString().slice(0, 10) });
        row.getCell("ingreso").numFmt = '#,##0.00 "€"';
        row.getCell("gasto").numFmt = '#,##0.00 "€"';
        row.getCell("saldo").numFmt = '#,##0.00 "€"';
        if (i % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
          });
        }
      });

      // Bordes finos en toda la tabla, para que se vea como tabla de verdad al abrirlo
      const lastRow = rows.length + 1;
      for (let r = 1; r <= lastRow; r++) {
        for (let c = 1; c <= sheet.columns.length; c++) {
          sheet.getCell(r, c).border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
        }
      }

      sheet.views = [{ state: "frozen", ySplit: 1 }]; // fija la cabecera al hacer scroll

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=informe.xlsx");
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=informe.pdf");
      doc.pipe(res);

      const pageWidth = doc.page.width - 60; // márgenes de 30 a cada lado
      const columns = [
        { label: "Fecha", width: 55 },
        { label: "Concepto", width: pageWidth - 55 - 65 - 65 - 65 - 120 },
        { label: "Origen", width: 120 },
        { label: "Ingreso", width: 65 },
        { label: "Gasto", width: 65 },
        { label: "Saldo", width: 65 },
      ];

      function drawHeader() {
        doc.fontSize(16).font("Helvetica-Bold").text("Informe económico", { align: "center" });
        doc.moveDown(0.7);
        const tableTop = doc.y;
        let x = doc.page.margins.left;
        doc.fontSize(9).font("Helvetica-Bold");
        columns.forEach((col) => {
          doc.rect(x, tableTop, col.width, 22).fill("#6b1530");
          doc.fillColor("#ffffff").text(col.label, x + 4, tableTop + 6, { width: col.width - 8, lineBreak: false });
          x += col.width;
        });
        doc.fillColor("#000000");
        return tableTop + 22;
      }

      let y = drawHeader();
      doc.font("Helvetica").fontSize(8);

      // Recorta el texto a mano para que quepa en una sola línea: la
      // combinación de "ellipsis" + "lineBreak: false" de pdfkit no siempre
      // evita que el texto se parta en varias líneas y se monte con la fila
      // siguiente (era justo el problema que se veía antes).
      function truncateToWidth(text: string, maxWidth: number): string {
        if (doc.widthOfString(text) <= maxWidth) return text;
        let truncated = text;
        while (truncated.length > 1 && doc.widthOfString(truncated + "…") > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + "…";
      }

      const rowHeight = 20;

      rows.forEach((r, i) => {
        // Salto de página si no cabe la fila siguiente (con margen extra
        // de seguridad para no dejar filas cortadas a medias)
        if (y > doc.page.height - doc.page.margins.bottom - 40) {
          doc.addPage();
          y = drawHeader();
          doc.font("Helvetica").fontSize(8);
        }

        if (i % 2 === 0) {
          doc.rect(doc.page.margins.left, y, pageWidth, rowHeight).fill("#f5f5f5");
          doc.fillColor("#000000");
        }

        let x = doc.page.margins.left;
        const cells = [
          r.fecha.toISOString().slice(0, 10),
          r.concepto,
          r.origen,
          r.ingreso > 0 ? r.ingreso.toFixed(2) + " €" : "",
          r.gasto > 0 ? r.gasto.toFixed(2) + " €" : "",
          r.saldo.toFixed(2) + " €",
        ];
        cells.forEach((cell, idx) => {
          const maxWidth = columns[idx].width - 8;
          const text = truncateToWidth(String(cell), maxWidth);
          doc.text(text, x + 4, y + 6, { width: maxWidth, height: rowHeight - 8, lineBreak: false });
          x += columns[idx].width;
        });
        y += rowHeight;
      });

      // Si no queda sitio para el resumen final, se pasa a una página nueva
      // en vez de dejarlo pegado o montado sobre la última fila.
      if (y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      // Línea final con los totales
      y += 6;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).strokeColor("#999999").stroke();
      y += 8;
      const totalIncome = rows.reduce((acc, r) => acc + r.ingreso, 0);
      const totalExpense = rows.reduce((acc, r) => acc + r.gasto, 0);
      const finalBalance = rows.length > 0 ? rows[rows.length - 1].saldo : 0;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text(`Total ingresos: ${totalIncome.toFixed(2)} €`, doc.page.margins.left, y, { lineBreak: false });
      doc.text(`Total gastos: ${totalExpense.toFixed(2)} €`, doc.page.margins.left + 200, y, { lineBreak: false });
      doc.text(`Saldo final: ${finalBalance.toFixed(2)} €`, doc.page.margins.left + 400, y, { lineBreak: false });

      doc.end();
      return;
    }

    res.status(400).json({ error: "Formato no soportado. Usa csv, excel o pdf." });
  } catch (err) {
    next(err);
  }
});

export default router;
