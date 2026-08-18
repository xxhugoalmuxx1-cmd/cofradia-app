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

    const withSummary = campaigns.map((c) => ({
      ...c,
      items: c.items.map((item) => {
        // Cada sábana equivale a 10 décimos, así que se cuenta multiplicando.
        const sold = item.sales.reduce(
          (acc, s) => acc + (s.unitType === "sabana" ? s.unitsSold * 10 : s.unitsSold),
          0
        );
        const pending = item.unitsReceived != null ? item.unitsReceived - sold : null;
        return { ...item, sold, pending, sales: undefined };
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

// Borra la campaña y, en cascada, sus números y ventas asociadas
// (configurado en el esquema con onDelete: Cascade).
router.delete("/campaigns/:id", requirePermission("lottery.update"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.lotteryCampaign.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "lottery_campaigns", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/items", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { campaignId, number, price, donationAmount, unitsReceived } = req.body;
    if (!campaignId || !number || !price) {
      return res.status(400).json({ error: "Faltan datos del número (campaña, número o precio)" });
    }
    const item = await prisma.lotteryItem.create({
      data: {
        campaignId,
        number: String(number),
        price: Number(price),
        donationAmount: Number(donationAmount || 0),
        // Unidades recibidas es opcional: hay cofradías que van recogiendo
        // más lotería de la gestoría poco a poco, sin saber el total al alta.
        unitsReceived: unitsReceived !== undefined && unitsReceived !== "" ? Number(unitsReceived) : null,
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
  const sold = item.sales.reduce((acc, s) => acc + (s.unitType === "sabana" ? s.unitsSold * 10 : s.unitsSold), 0);
  res.json({ ...item, sold, pending: item.unitsReceived != null ? item.unitsReceived - sold : null });
});

// El tipo de unidad (décimo/sábana) se elige al registrar la venta, no al
// dar de alta el número: el mismo número puede venderse suelto en décimos
// o repartirse en sábanas completas según convenga en cada operación.
router.post("/sales", requirePermission("lottery.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { lotteryItemId, unitType, unitsSold, amountPaid, establishmentName, memberId } = req.body;
    if (!lotteryItemId || !unitsSold || !amountPaid) {
      return res.status(400).json({ error: "Faltan datos de la venta (número, unidades o importe)" });
    }
    const sale = await prisma.lotterySale.create({
      data: {
        lotteryItemId,
        unitType: unitType === "sabana" ? "sabana" : "decimo",
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

router.get("/sales", requirePermission("lottery.read"), async (req, res, next) => {
  try {
    const { campaignId, unitType } = req.query;
    const sales = await prisma.lotterySale.findMany({
      where: {
        unitType: unitType ? String(unitType) : undefined,
        lotteryItem: campaignId ? { campaignId: String(campaignId) } : undefined,
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
