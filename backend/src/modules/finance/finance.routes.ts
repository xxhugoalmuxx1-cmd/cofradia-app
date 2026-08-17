import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

// ---------- INGRESOS ----------
router.get("/income", requirePermission("finance.read"), async (_req, res) => {
  const income = await prisma.income.findMany({
    include: { createdBy: { select: { fullName: true } } },
    orderBy: { date: "desc" },
  });
  res.json(income);
});

router.post("/income", requirePermission("finance.create"), async (req: AuthedRequest, res, next) => {
  try {
    const income = await prisma.income.create({
      data: { ...req.body, createdByUserId: req.user!.id },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "income", recordId: income.id, newValue: req.body });
    res.status(201).json(income);
  } catch (err) {
    next(err);
  }
});

router.post("/income/:id/void", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    const { reason } = req.body;
    const income = await prisma.income.update({
      where: { id: req.params.id },
      data: { voidedByUserId: req.user!.id, voidReason: reason, voidedAt: new Date() },
    });
    await logAudit({ userId: req.user!.id, action: "void", module: "income", recordId: income.id, newValue: { reason } });
    res.json(income);
  } catch (err) {
    next(err);
  }
});

router.put("/income/:id", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    const before = await prisma.income.findUnique({ where: { id: req.params.id } });
    const { concept, category, amount, paymentMethod, notes } = req.body;
    const income = await prisma.income.update({
      where: { id: req.params.id },
      data: { concept, category, amount, paymentMethod, notes },
    });
    await logAudit({ userId: req.user!.id, action: "update", module: "income", recordId: income.id, previousValue: before, newValue: req.body });
    res.json(income);
  } catch (err) {
    next(err);
  }
});

router.delete("/income/:id", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.income.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "income", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- GASTOS ----------
router.get("/expenses", requirePermission("finance.read"), async (_req, res) => {
  const expenses = await prisma.expense.findMany({
    include: { createdBy: { select: { fullName: true } } },
    orderBy: { date: "desc" },
  });
  res.json(expenses);
});

router.post("/expenses", requirePermission("finance.create"), async (req: AuthedRequest, res, next) => {
  try {
    const expense = await prisma.expense.create({
      data: { ...req.body, createdByUserId: req.user!.id },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "expenses", recordId: expense.id, newValue: req.body });
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

router.post("/expenses/:id/void", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    const { reason } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { voidedByUserId: req.user!.id, voidReason: reason, voidedAt: new Date() },
    });
    await logAudit({ userId: req.user!.id, action: "void", module: "expenses", recordId: expense.id, newValue: { reason } });
    res.json(expense);
  } catch (err) {
    next(err);
  }
});

router.put("/expenses/:id", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    const before = await prisma.expense.findUnique({ where: { id: req.params.id } });
    const { concept, category, amount, supplier, paymentMethod, notes } = req.body;
    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: { concept, category, amount, supplier, paymentMethod, notes },
    });
    await logAudit({ userId: req.user!.id, action: "update", module: "expenses", recordId: expense.id, previousValue: before, newValue: req.body });
    res.json(expense);
  } catch (err) {
    next(err);
  }
});

router.delete("/expenses/:id", requirePermission("finance.update"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "expenses", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
