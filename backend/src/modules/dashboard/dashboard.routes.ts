import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [cashRegisters, bankAccounts, monthIncome, monthExpenses, memberCount, lotterySales, salesCount] =
    await Promise.all([
      prisma.cashRegister.findMany(),
      prisma.bankAccount.findMany(),
      prisma.income.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart }, voidedAt: null } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: monthStart }, voidedAt: null } }),
      prisma.member.count(),
      prisma.lotterySale.aggregate({ _sum: { unitsSold: true } }),
      prisma.sale.count({ where: { date: { gte: monthStart } } }),
    ]);

  const cashTotal = cashRegisters.reduce((acc, c) => acc + Number(c.currentBalance), 0);
  const bankTotal = bankAccounts.reduce((acc, b) => acc + Number(b.currentBalance), 0);

  res.json({
    balance: {
      total: cashTotal + bankTotal,
      cash: cashTotal,
      bank: bankTotal,
    },
    month: {
      income: Number(monthIncome._sum.amount || 0),
      expenses: Number(monthExpenses._sum.amount || 0),
      balance: Number(monthIncome._sum.amount || 0) - Number(monthExpenses._sum.amount || 0),
    },
    activity: {
      lotteryUnitsSold: lotterySales._sum.unitsSold || 0,
      salesThisMonth: salesCount,
      members: memberCount,
    },
  });
});

export default router;
