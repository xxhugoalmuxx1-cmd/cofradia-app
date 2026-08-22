import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requireAdmin } from "../../middlewares/permissions";

const router = Router();
router.use(requireAuth);

// La auditoría es de solo lectura salvo para el borrado explícito de un
// admin (más abajo): no existen endpoints de UPDATE.
router.get("/", requireAdmin, async (req, res) => {
  const { userId, module, from, to } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: {
      userId: userId ? String(userId) : undefined,
      module: module ? String(module) : undefined,
      createdAt: {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(`${to}T23:59:59.999`) : undefined,
      },
    },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  res.json(logs);
});

// Borra un registro individual de auditoría. Solo el administrador puede
// hacerlo (excepción deliberada a la norma de "no se borra auditoría",
// pedida explícitamente para poder limpiar el histórico si hace falta).
router.delete("/:id", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    await prisma.auditLog.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Borra en bloque todos los registros anteriores a una fecha dada
// (?before=YYYY-MM-DD), útil para limpiar auditoría antigua de golpe.
router.delete("/", requireAdmin, async (req: AuthedRequest, res, next) => {
  try {
    const { before } = req.query;
    if (!before) return res.status(400).json({ error: "Indica una fecha límite con ?before=" });
    const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(String(before)) } } });
    res.json({ deleted: result.count });
  } catch (err) {
    next(err);
  }
});

export default router;
