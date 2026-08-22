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

// Registrar venta. Admite dos tipos de línea:
// - de catálogo: { productId, quantity, unitPrice? } -> descuenta stock, precio editable
// - manual/libre: { description, quantity, unitPrice } -> cobro de cualquier importe,
//   sin necesidad de tener el producto dado de alta (ej. donativo puntual, algo suelto)
router.post("/", requirePermission("sales.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { items, paymentMethod, memberId, eventId, cashRegisterId, bankAccountId } = req.body as {
      items: { productId?: string; description?: string; quantity: number; unitPrice?: number }[];
      paymentMethod: string;
      memberId?: string;
      eventId?: string;
      cashRegisterId?: string;
      bankAccountId?: string;
    };

    if (!items || items.length === 0) throw new ApiError(400, "La venta no tiene ninguna línea");

    const result = await prisma.$transaction(async (tx) => {
      let total = 0;
      const saleItemsData = [];

      for (const item of items) {
        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new ApiError(404, `Producto no encontrado: ${item.productId}`);

          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) throw new ApiError(409, `Stock insuficiente para ${product.name}`);

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
        } else {
          // Línea manual: sin producto, importe libre.
          if (!item.description || item.unitPrice === undefined) {
            throw new ApiError(400, "Una línea manual necesita descripción e importe");
          }
          const subtotal = Number(item.unitPrice) * item.quantity;
          total += subtotal;
          saleItemsData.push({
            description: item.description,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            subtotal,
          });
        }
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

      // Ahora que Tesorería ya no existe como sección aparte, el propio
      // movimiento de caja o banco ES el registro contable del ingreso —
      // no se duplica en ninguna otra tabla.
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
      } else if ((paymentMethod === "tarjeta" || paymentMethod === "bizum") && bankAccountId) {
        // El dinero de tarjeta/Bizum no pasa por la caja física: se refleja
        // directamente en la cuenta bancaria indicada.
        const account = await tx.bankAccount.findUnique({ where: { id: bankAccountId } });
        if (account) {
          const newBalance = Number(account.currentBalance) + total;
          await tx.bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: newBalance } });
          await tx.bankMovement.create({
            data: {
              bankAccountId,
              type: "in",
              amount: total,
              concept: `Venta #${sale.id.slice(0, 8)} (${paymentMethod})`,
              resultingBalance: newBalance,
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
