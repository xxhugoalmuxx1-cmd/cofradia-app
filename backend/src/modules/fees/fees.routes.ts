import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

// Periodos de cuota (ej. "Cuota 2026")
router.get("/periods", requirePermission("fees.read"), async (_req, res) => {
  const periods = await prisma.feePeriod.findMany({ include: { fees: true }, orderBy: { year: "desc" } });
  res.json(
    periods.map((p) => ({
      ...p,
      paidCount: p.fees.filter((f) => f.paid).length,
      pendingCount: p.fees.filter((f) => !f.paid).length,
    }))
  );
});

router.post("/periods", requirePermission("fees.create"), async (req: AuthedRequest, res, next) => {
  try {
    const period = await prisma.feePeriod.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "fee_periods", recordId: period.id });
    res.status(201).json(period);
  } catch (err) {
    next(err);
  }
});

// Genera automáticamente una cuota pendiente por cada socio para un periodo dado
router.post("/periods/:id/generate", requirePermission("fees.create"), async (req: AuthedRequest, res, next) => {
  try {
    const period = await prisma.feePeriod.findUnique({ where: { id: req.params.id } });
    if (!period) return res.status(404).json({ error: "Periodo no encontrado" });

    const members = await prisma.member.findMany({ where: { status: "active" } });
    const existing = await prisma.fee.findMany({ where: { feePeriodId: period.id }, select: { memberId: true } });
    const existingIds = new Set(existing.map((f) => f.memberId));

    const toCreate = members.filter((m) => !existingIds.has(m.id));
    await prisma.fee.createMany({
      data: toCreate.map((m) => ({ feePeriodId: period.id, memberId: m.id, amount: period.amount, paid: false })),
    });

    await logAudit({ userId: req.user!.id, action: "generate", module: "fees", recordId: period.id, newValue: { count: toCreate.length } });
    res.json({ created: toCreate.length });
  } catch (err) {
    next(err);
  }
});

router.get("/", requirePermission("fees.read"), async (req, res) => {
  const { status, periodId } = req.query;
  const fees = await prisma.fee.findMany({
    where: {
      feePeriodId: periodId ? String(periodId) : undefined,
      paid: status === "paid" ? true : status === "pending" ? false : undefined,
    },
    include: { member: true, feePeriod: true },
  });
  res.json(fees);
});

router.post("/:id/pay", requirePermission("fees.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { paymentMethod } = req.body;
    const fee = await prisma.fee.update({
      where: { id: req.params.id },
      data: { paid: true, paidDate: new Date(), paymentMethod },
    });
    await logAudit({ userId: req.user!.id, action: "pay", module: "fees", recordId: fee.id });
    res.json(fee);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("fees.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { amount, paid } = req.body;
    const fee = await prisma.fee.update({ where: { id: req.params.id }, data: { amount, paid } });
    await logAudit({ userId: req.user!.id, action: "update", module: "fees", recordId: fee.id, newValue: req.body });
    res.json(fee);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("fees.create"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.fee.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "fees", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
