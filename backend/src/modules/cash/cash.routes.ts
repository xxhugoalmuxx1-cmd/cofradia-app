import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

router.get("/:id", requirePermission("cash.read"), async (req, res) => {
  const cashRegister = await prisma.cashRegister.findUnique({
    where: { id: req.params.id },
    include: { movements: { orderBy: { createdAt: "desc" }, take: 50, include: { createdBy: { select: { fullName: true } } } } },
  });
  res.json(cashRegister);
});

// Movimiento genérico (entrada/salida manual)
router.post("/:id/movements", requirePermission("cash.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { type, amount, concept } = req.body; // type: "in" | "out"
    const result = await prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findUnique({ where: { id: req.params.id } });
      if (!register) throw new ApiError(404, "Caja no encontrada");

      const delta = type === "in" ? Number(amount) : -Number(amount);
      const newBalance = Number(register.currentBalance) + delta;
      if (newBalance < 0) throw new ApiError(400, "Saldo de caja insuficiente");

      const updated = await tx.cashRegister.update({
        where: { id: register.id },
        data: { currentBalance: newBalance },
      });

      const movement = await tx.cashMovement.create({
        data: {
          cashRegisterId: register.id,
          type,
          amount,
          concept,
          resultingBalance: newBalance,
          createdByUserId: req.user!.id,
        },
      });

      return { register: updated, movement };
    });

    await logAudit({ userId: req.user!.id, action: "movement", module: "cash", recordId: result.movement.id, newValue: req.body });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Retirada de dinero (caso específico del punto 8 del prompt)
router.post("/:id/withdraw", requirePermission("cash.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { amount, reason, withdrawnBy, notes } = req.body;
    const concept = `Retirada: ${reason}${withdrawnBy ? " — Realizado por " + withdrawnBy : ""}${notes ? " — " + notes : ""}`;

    const result = await prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findUnique({ where: { id: req.params.id } });
      if (!register) throw new ApiError(404, "Caja no encontrada");

      const newBalance = Number(register.currentBalance) - Number(amount);
      if (newBalance < 0) throw new ApiError(400, "Saldo de caja insuficiente");

      const updated = await tx.cashRegister.update({ where: { id: register.id }, data: { currentBalance: newBalance } });
      const movement = await tx.cashMovement.create({
        data: {
          cashRegisterId: register.id,
          type: "out",
          amount,
          concept,
          resultingBalance: newBalance,
          createdByUserId: req.user!.id,
        },
      });

      return { register: updated, movement };
    });

    await logAudit({ userId: req.user!.id, action: "withdraw", module: "cash", recordId: result.movement.id, newValue: req.body });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Cierre de caja
router.post("/:id/close", requirePermission("cash.close"), async (req: AuthedRequest, res, next) => {
  try {
    const { openingBalance, totalIncome, totalExpense, countedBalance, notes } = req.body;
    const expectedBalance = Number(openingBalance) + Number(totalIncome) - Number(totalExpense);
    const difference = Number(countedBalance) - expectedBalance;

    const closure = await prisma.cashClosure.create({
      data: {
        cashRegisterId: req.params.id,
        openingBalance,
        totalIncome,
        totalExpense,
        expectedBalance,
        countedBalance,
        difference,
        notes,
        closedByUserId: req.user!.id,
      },
    });

    await logAudit({ userId: req.user!.id, action: "close", module: "cash_closures", recordId: closure.id, newValue: req.body });
    res.status(201).json(closure);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/closures", requirePermission("cash.read"), async (req, res) => {
  const closures = await prisma.cashClosure.findMany({
    where: { cashRegisterId: req.params.id },
    orderBy: { closedAt: "desc" },
  });
  res.json(closures);
});

export default router;
