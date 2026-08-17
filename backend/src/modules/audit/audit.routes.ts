import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";

const router = Router();
router.use(requireAuth);

// Solo lectura: no existen endpoints de UPDATE/DELETE para audit_logs.
router.get("/", requirePermission("audit.read"), async (req, res) => {
  const { userId, module, from, to } = req.query;
  const logs = await prisma.auditLog.findMany({
    where: {
      userId: userId ? String(userId) : undefined,
      module: module ? String(module) : undefined,
      createdAt: {
        gte: from ? new Date(String(from)) : undefined,
        lte: to ? new Date(String(to)) : undefined,
      },
    },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  res.json(logs);
});

export default router;
