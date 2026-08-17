import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("products.read"), async (_req, res) => {
  const products = await prisma.product.findMany({ where: { isActive: true }, include: { category: true } });
  res.json(products);
});

router.post("/", requirePermission("products.create"), async (req: AuthedRequest, res, next) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    await logAudit({ userId: req.user!.id, action: "create", module: "products", recordId: product.id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("products.update"), async (req: AuthedRequest, res, next) => {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: "update", module: "products", recordId: product.id });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.get("/categories", requirePermission("products.read"), async (_req, res) => {
  const categories = await prisma.productCategory.findMany();
  res.json(categories);
});

router.post("/categories", requirePermission("products.create"), async (req, res) => {
  const category = await prisma.productCategory.create({ data: req.body });
  res.status(201).json(category);
});

export default router;
