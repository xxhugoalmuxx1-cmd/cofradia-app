import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requireAdmin } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/roles", requireAdmin, async (_req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  res.json(roles);
});

router.get("/", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { fullName: "asc" },
  });
  res.json(users.map(({ passwordHash, ...u }) => u));
});

router.post("/", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { fullName, email, phone, password, roleId } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { fullName, email, phone, passwordHash, roleId },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "users", recordId: user.id });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { fullName, phone, roleId } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, phone, roleId },
    });
    await logAudit({ userId: req.user!.id, action: "update", module: "users", recordId: user.id });
    const { passwordHash, ...safe } = user;
    res.json(safe);
  } catch (err) {
    next(err);
  }
});

router.put("/:id/deactivate", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "No puedes desactivar tu propio usuario" });
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAudit({ userId: req.user!.id, action: "deactivate", module: "users", recordId: user.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/activate", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: true } });
    await logAudit({ userId: req.user!.id, action: "activate", module: "users", recordId: user.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put("/:id/reset-password", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { newPassword } = req.body;
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });
    await logAudit({ userId: req.user!.id, action: "reset_password", module: "users", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Borra un usuario de verdad (no solo desactivarlo). Solo se permite si no
// tiene movimientos históricos vinculados a su nombre (ventas, caja,
// lotería, documentos, auditoría...), porque esas tablas exigen un usuario
// válido para mantener la trazabilidad. Si los tiene, se sugiere
// desactivarlo en su lugar, para no perder ese historial.
router.delete("/:id", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      return res.status(400).json({ error: "No puedes borrar tu propio usuario" });
    }
    const [sales, cashMovements, lotterySales, documents, auditLogs] = await Promise.all([
      prisma.sale.count({ where: { createdByUserId: req.params.id } }),
      prisma.cashMovement.count({ where: { createdByUserId: req.params.id } }),
      prisma.lotterySale.count({ where: { createdByUserId: req.params.id } }),
      prisma.document.count({ where: { uploadedByUserId: req.params.id } }),
      prisma.auditLog.count({ where: { userId: req.params.id } }),
    ]);
    if (sales + cashMovements + lotterySales + documents + auditLogs > 0) {
      return res.status(409).json({
        error: "Este usuario tiene operaciones registradas a su nombre (ventas, caja, lotería, documentos o auditoría). Para conservar ese historial, desactívalo en vez de borrarlo.",
      });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    await logAudit({ userId: req.user!.id, action: "delete", module: "users", recordId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
