import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    cashRegisters,
    bankAccounts,
    cashMovementsThisMonth,
    bankMovementsThisMonth,
    memberCount,
    lotterySales,
    salesCount,
  ] = await Promise.all([
    prisma.cashRegister.findMany(),
    prisma.bankAccount.findMany(),
    prisma.cashMovement.findMany({ where: { createdAt: { gte: monthStart } }, select: { type: true, amount: true } }),
    prisma.bankMovement.findMany({ where: { date: { gte: monthStart } }, select: { type: true, amount: true } }),
    prisma.member.count(),
    prisma.lotterySale.findMany({ select: { unitType: true, unitsSold: true } }),
    prisma.sale.count({ where: { date: { gte: monthStart } } }),
  ]);

  const cashTotal = cashRegisters.reduce((acc, c) => acc + Number(c.currentBalance), 0);
  const bankTotal = bankAccounts.reduce((acc, b) => acc + Number(b.currentBalance), 0);

  // Ahora que no existe Tesorería como sección aparte, "ingresos/gastos del
  // mes" se calculan directamente de los movimientos reales de caja y banco.
  const allMovements = [...cashMovementsThisMonth, ...bankMovementsThisMonth];
  const monthIncome = allMovements.filter((m) => m.type === "in").reduce((acc, m) => acc + Number(m.amount), 0);
  const monthExpenses = allMovements.filter((m) => m.type === "out").reduce((acc, m) => acc + Number(m.amount), 0);

  // Cada sábana equivale a 10 décimos, hay que contarlo así.
  const lotteryUnitsSold = lotterySales.reduce(
    (acc, s) => acc + (s.unitType === "sabana" ? s.unitsSold * 10 : s.unitsSold),
    0
  );

  res.json({
    balance: {
      total: cashTotal + bankTotal,
      cash: cashTotal,
      bank: bankTotal,
    },
    month: {
      income: monthIncome,
      expenses: monthExpenses,
      balance: monthIncome - monthExpenses,
    },
    activity: {
      lotteryUnitsSold,
      salesThisMonth: salesCount,
      members: memberCount,
    },
  });
});

export default router;
