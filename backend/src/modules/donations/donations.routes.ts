import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("donations.read"), async (req, res) => {
  const { year } = req.query;
  const donations = await prisma.donation.findMany({
    where: year
      ? { date: { gte: new Date(Number(year), 0, 1), lte: new Date(Number(year), 11, 31, 23, 59, 59) } }
      : undefined,
    include: { member: true },
    orderBy: { date: "desc" },
  });
  res.json(donations);
});

router.post("/", requirePermission("donations.create"), async (req: AuthedRequest, res, next) => {
  try {
    const donation = await prisma.donation.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "donations", recordId: donation.id, newValue: req.body });
    res.status(201).json(donation);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("donations.create"), async (req: AuthedRequest, res, next) => {
  try {
    const before = await prisma.donation.findUnique({ where: { id: req.params.id } });
    const donation = await prisma.donation.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: "update", module: "donations", recordId: donation.id, previousValue: before, newValue: req.body });
    res.json(donation);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requirePermission("donations.create"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.donation.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "donations", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
