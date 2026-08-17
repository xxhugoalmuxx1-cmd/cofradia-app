import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("events.read"), async (_req, res) => {
  const events = await prisma.event.findMany({ orderBy: { date: "desc" } });
  res.json(events);
});

router.get("/:id", requirePermission("events.read"), async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ error: "No encontrado" });

  // Ingresos y gastos asociados al evento, para mostrar su balance
  const [income, expenses] = await Promise.all([
    prisma.income.aggregate({ _sum: { amount: true }, where: { eventId: event.id, voidedAt: null } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { eventId: event.id, voidedAt: null } }),
  ]);

  res.json({
    ...event,
    totalIncome: Number(income._sum.amount || 0),
    totalExpenses: Number(expenses._sum.amount || 0),
  });
});

router.post("/", requirePermission("events.create"), async (req: AuthedRequest, res, next) => {
  try {
    const event = await prisma.event.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "events", recordId: event.id });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("events.update"), async (req: AuthedRequest, res, next) => {
  try {
    const event = await prisma.event.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: "update", module: "events", recordId: event.id });
    res.json(event);
  } catch (err) {
    next(err);
  }
});

export default router;
