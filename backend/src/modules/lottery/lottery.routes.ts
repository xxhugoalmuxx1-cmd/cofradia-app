import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/campaigns", requirePermission("lottery.read"), async (_req, res, next) => {
  try {
    const campaigns = await prisma.lotteryCampaign.findMany({
      include: { items: { include: { sales: true } } },
      orderBy: { id: "desc" },
    });

    // Se calcula aquí (una sola consulta) cuántas unidades se han vendido y
    // cuántas quedan pendientes por número, en vez de que el frontend tenga
    // que pedirlo número a número (eso era lo que hacía la pantalla lenta).
    const withSummary = campaigns.map((c) => ({
      ...c,
      items: c.items.map((item) => {
        const sold = item.sales.reduce((acc, s) => acc + s.unitsSold, 0);
        return { ...item, sold, pending: item.unitsReceived - sold, sales: undefined };
      }),
    }));

    res.json(withSummary);
  } catch (err) {
    next(err);
  }
});

router.post("/campaigns", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { name, drawDate } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "El nombre de la campaña es obligatorio" });
    }
    const campaign = await prisma.lotteryCampaign.create({
      data: { name: String(name).trim(), drawDate: drawDate ? new Date(drawDate) : undefined },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "lottery_campaigns", recordId: campaign.id });
    res.status(201).json(campaign);
  } catch (err) {
    next(err);
  }
});

router.post("/items", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { campaignId, number, unitType, price, donationAmount, unitsReceived } = req.body;
    if (!campaignId || !number || !price || !unitsReceived) {
      return res.status(400).json({ error: "Faltan datos del número (campaña, número, precio o unidades)" });
    }
    const item = await prisma.lotteryItem.create({
      data: {
        campaignId,
        number: String(number),
        unitType: unitType === "sabana" ? "sabana" : "decimo",
        price: Number(price),
        donationAmount: Number(donationAmount || 0),
        unitsReceived: Number(unitsReceived),
      },
    });
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
    const { lotteryItemId, unitsSold, amountPaid, establishmentName, memberId } = req.body;
    if (!lotteryItemId || !unitsSold || !amountPaid) {
      return res.status(400).json({ error: "Faltan datos de la venta (número, unidades o importe)" });
    }
    const sale = await prisma.lotterySale.create({
      data: {
        lotteryItemId,
        unitsSold: Number(unitsSold),
        amountPaid: Number(amountPaid),
        establishmentName: establishmentName || undefined,
        memberId: memberId || undefined,
        createdByUserId: req.user!.id,
      },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "lottery_sales", recordId: sale.id, newValue: req.body });
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
});

// Historial completo de ventas de lotería, filtrable por campaña y por
// tipo de unidad (décimo / sábana) — para poder revisar por separado.
router.get("/sales", requirePermission("lottery.read"), async (req, res, next) => {
  try {
    const { campaignId, unitType } = req.query;
    const sales = await prisma.lotterySale.findMany({
      where: {
        lotteryItem: {
          campaignId: campaignId ? String(campaignId) : undefined,
          unitType: unitType ? String(unitType) : undefined,
        },
      },
      include: {
        lotteryItem: { include: { campaign: true } },
        createdBy: { select: { fullName: true } },
        member: { select: { firstName: true, lastName: true } },
      },
      orderBy: { saleDate: "desc" },
    });
    res.json(sales);
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
