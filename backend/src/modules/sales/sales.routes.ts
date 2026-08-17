import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("sales.read"), async (_req, res) => {
  const sales = await prisma.sale.findMany({
    include: { items: { include: { product: true } }, createdBy: { select: { fullName: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
  res.json(sales);
});

// Registrar venta: valida y descuenta stock de forma transaccional,
// evitando stock negativo si dos usuarios venden a la vez.
router.post("/", requirePermission("sales.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { items, paymentMethod, memberId, eventId, cashRegisterId } = req.body as {
      items: { productId: string; quantity: number; unitPrice?: number }[];
      paymentMethod: string;
      memberId?: string;
      eventId?: string;
      cashRegisterId?: string;
    };

    const result = await prisma.$transaction(async (tx) => {
      let total = 0;
      const saleItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new ApiError(404, `Producto no encontrado: ${item.productId}`);

        // Bloqueo optimista: solo actualiza si hay stock suficiente en este mismo update.
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) throw new ApiError(409, `Stock insuficiente para ${product.name}`);

        // Si se indica un precio distinto (ej. promoción, donativo extra, cambio manual),
        // se usa ese en vez del precio de catálogo.
        const effectivePrice =
          item.unitPrice !== undefined && item.unitPrice !== null && !Number.isNaN(Number(item.unitPrice))
            ? Number(item.unitPrice)
            : Number(product.price);

        const subtotal = effectivePrice * item.quantity;
        total += subtotal;
        saleItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: effectivePrice,
          subtotal,
        });
      }

      const sale = await tx.sale.create({
        data: {
          totalAmount: total,
          paymentMethod,
          memberId,
          eventId,
          createdByUserId: req.user!.id,
          items: { create: saleItemsData },
        },
        include: { items: true },
      });

      // Genera automáticamente el ingreso correspondiente
      await tx.income.create({
        data: {
          concept: `Venta #${sale.id.slice(0, 8)}`,
          category: "ventas",
          amount: total,
          paymentMethod,
          memberId,
          eventId,
          createdByUserId: req.user!.id,
        },
      });

      // Si el pago es en efectivo, se refleja en caja: si no se indica una
      // caja concreta, se usa la caja principal por defecto.
      if (paymentMethod === "efectivo") {
        const targetRegisterId = cashRegisterId || "00000000-0000-0000-0000-000000000001";
        const register = await tx.cashRegister.findUnique({ where: { id: targetRegisterId } });
        if (register) {
          const newBalance = Number(register.currentBalance) + total;
          await tx.cashRegister.update({ where: { id: targetRegisterId }, data: { currentBalance: newBalance } });
          await tx.cashMovement.create({
            data: {
              cashRegisterId: targetRegisterId,
              type: "in",
              amount: total,
              concept: `Venta #${sale.id.slice(0, 8)}`,
              resultingBalance: newBalance,
              createdByUserId: req.user!.id,
            },
          });
        }
      }

      return sale;
    });

    await logAudit({ userId: req.user!.id, action: "create", module: "sales", recordId: result.id, newValue: req.body });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
