import { Router } from "express";
import { prisma } from "../../config/prisma";

// Rutas SIN autenticación: pensadas para compartir fuera de la app
// (ej. el catálogo de productos, para enviar el enlace a cualquiera).
const router = Router();

router.get("/catalog", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });
    res.json(
      products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        category: p.category?.name || null,
        available: p.stock > 0,
      }))
    );
  } catch (err) {
    next(err);
  }
});

export default router;
