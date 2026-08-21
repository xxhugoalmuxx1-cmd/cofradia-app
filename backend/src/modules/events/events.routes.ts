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
  res.json(event);
});

router.post("/", requirePermission("events.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { name, date, description, budget, notes } = req.body;
    if (!name || !date) {
      return res.status(400).json({ error: "El nombre y la fecha son obligatorios" });
    }
    const event = await prisma.event.create({
      data: { name, date: new Date(date), description, budget: budget ? Number(budget) : undefined, notes },
    });
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

router.delete("/:id", requirePermission("events.update"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "events", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
