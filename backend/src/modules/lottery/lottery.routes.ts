import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/campaigns", requirePermission("lottery.read"), async (_req, res) => {
  const campaigns = await prisma.lotteryCampaign.findMany({ include: { items: true } });
  res.json(campaigns);
});

router.post("/campaigns", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const campaign = await prisma.lotteryCampaign.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "lottery_campaigns", recordId: campaign.id });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

router.post("/items", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const item = await prisma.lotteryItem.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "lottery_items", recordId: item.id });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.get("/items/:id/summary", requirePermission("lottery.read"), async (req, res) => {
  const item = await prisma.lotteryItem.findUnique({ where: { id: req.params.id }, include: { sales: true } });
  if (!item) return res.status(404).json({ error: "No encontrado" });
  const sold = item.sales.reduce((acc, s) => acc + s.unitsSold, 0);
  res.json({ ...item, sold, pending: item.unitsReceived - sold });
});

router.post("/sales", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const sale = await prisma.lotterySale.create({
      data: { ...req.body, createdByUserId: req.user!.id },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "lottery_sales", recordId: sale.id, newValue: req.body });
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
});

router.put("/sales/:id/deliver", requirePermission("lottery.update"), async (req: AuthedRequest, res, next) => {
  try {
    const sale = await prisma.lotterySale.update({ where: { id: req.params.id }, data: { delivered: true } });
    await logAudit({ userId: req.user!.id, action: "deliver", module: "lottery_sales", recordId: sale.id });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

export default router;
