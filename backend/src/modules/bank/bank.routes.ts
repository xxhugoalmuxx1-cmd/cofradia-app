import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, AuthedRequest } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/permissions";
import { logAudit } from "../../utils/audit";
import { ApiError } from "../../middlewares/errorHandler";

const router = Router();
router.use(requireAuth);

router.get("/", requirePermission("bank.read"), async (_req, res) => {
  const accounts = await prisma.bankAccount.findMany();
  res.json(accounts);
});

router.post("/", requirePermission("bank.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { name, bankName, iban, initialBalance } = req.body;
    const account = await prisma.bankAccount.create({
      data: { name, bankName, iban, initialBalance: initialBalance ?? 0, currentBalance: initialBalance ?? 0 },
    });
    await logAudit({ userId: req.user!.id, action: "create", module: "bank_accounts", recordId: account.id });
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requirePermission("bank.update"), async (req: AuthedRequest, res, next) => {
  try {
    const account = await prisma.bankAccount.update({ where: { id: req.params.id }, data: req.body });
    await logAudit({ userId: req.user!.id, action: "update", module: "bank_accounts", recordId: account.id });
    res.json(account);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/movements", requirePermission("bank.read"), async (req, res) => {
  const { year, month } = req.query;
  let gte: Date | undefined;
  let lte: Date | undefined;
  if (year) {
    const y = Number(year);
    const m = month ? Number(month) - 1 : 0;
    gte = month ? new Date(y, m, 1) : new Date(y, 0, 1);
    lte = month ? new Date(y, m + 1, 0, 23, 59, 59) : new Date(y, 11, 31, 23, 59, 59);
  }
  const movements = await prisma.bankMovement.findMany({
    where: { bankAccountId: req.params.id, date: gte ? { gte, lte } : undefined },
    orderBy: { date: "desc" },
  });
  res.json(movements);
});

router.post("/:id/movements", requirePermission("bank.create"), async (req: AuthedRequest, res, next) => {
  try {
    const { type, amount, concept, date } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.findUnique({ where: { id: req.params.id } });
      if (!account) throw new ApiError(404, "Cuenta no encontrada");

      const delta = type === "in" ? Number(amount) : -Number(amount);
      const newBalance = Number(account.currentBalance) + delta;

      const updated = await tx.bankAccount.update({ where: { id: account.id }, data: { currentBalance: newBalance } });
      const movement = await tx.bankMovement.create({
        data: {
          bankAccountId: account.id,
          type,
          amount,
          concept,
          date: date ? new Date(date) : new Date(),
          resultingBalance: newBalance,
        },
      });

      return { account: updated, movement };
    });

    await logAudit({ userId: req.user!.id, action: "movement", module: "bank_movements", recordId: result.movement.id });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put("/movements/:id/reconcile", requirePermission("bank.update"), async (req: AuthedRequest, res, next) => {
  try {
    const movement = await prisma.bankMovement.update({ where: { id: req.params.id }, data: { reconciled: true } });
    await logAudit({ userId: req.user!.id, action: "reconcile", module: "bank_movements", recordId: movement.id });
    res.json(movement);
  } catch (err) {
    next(err);
  }
});

export default router;
