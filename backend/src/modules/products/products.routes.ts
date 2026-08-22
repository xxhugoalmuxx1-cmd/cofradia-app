import { Router } from "express";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

const PRODUCTS_BUCKET = process.env.SUPABASE_PRODUCTS_BUCKET || "products";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new ApiError(500, "Supabase no está configurado");
  return createClient(url, key);
}

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

// No se borra físicamente: se desactiva. Así no se pierden ni se rompen
// las ventas ya registradas que hacen referencia a este producto.
router.delete("/:id", requirePermission("products.update"), async (req: AuthedRequest, res, next) => {
  try {
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    await logAudit({ userId: req.user!.id, action: "deactivate", module: "products", recordId: req.params.id });
    res.json({ ok: true });
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

// Sube o reemplaza la foto de un producto. Se guarda siempre en la misma
// ruta (el id del producto), así la URL nunca cambia aunque se actualice
// la imagen — el catálogo público la refleja automáticamente.
router.post("/:id/image", requirePermission("products.update"), upload.single("image"), async (req: AuthedRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se ha subido ninguna imagen" });

    const supabase = getSupabase();
    const path = `${req.params.id}`;

    const { error: uploadError } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) throw new ApiError(500, `Error subiendo imagen: ${uploadError.message}`);

    const { data } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(path);
    // Se añade un parámetro de caché al final para que el navegador no
    // siga mostrando la imagen antigua tras cambiarla.
    const imageUrl = `${data.publicUrl}?v=${Date.now()}`;

    const product = await prisma.product.update({ where: { id: req.params.id }, data: { imageUrl } });
    await logAudit({ userId: req.user!.id, action: "upload_image", module: "products", recordId: product.id });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;
