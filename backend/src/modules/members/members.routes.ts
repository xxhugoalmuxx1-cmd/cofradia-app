import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("members.read"), async (req, res) => {
  const { search } = req.query;
  const members = await prisma.member.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: String(search), mode: "insensitive" } },
            { lastName: { contains: String(search), mode: "insensitive" } },
            { memberNumber: { contains: String(search), mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { lastName: "asc" },
  });
  res.json(members);
});

router.get("/:id", requirePermission("members.read"), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: { fees: true, donations: true, lotterySales: true },
  });
  res.json(member);
});

router.post("/", requirePermission("members.create"), async (req: AuthedRequest, res, next) => {
  try {
    const member = await prisma.member.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "members", recordId: member.id, newValue: req.body });
    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("members.update"), async (req: AuthedRequest, res, next) => {
  try {
    const before = await prisma.member.findUnique({ where: { id: req.params.id } });
    const member = await prisma.member.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({
      userId: req.user!.id,
      action: "update",
      module: "members",
      recordId: member.id,
      previousValue: before,
      newValue: req.body,
    });
    res.json(member);
  } catch (err) {
    next(err);
  }
});

export default router;
