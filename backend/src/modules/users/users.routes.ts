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

export default router;
