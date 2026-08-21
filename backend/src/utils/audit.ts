import { prisma } from "../config/prisma";

export async function logAudit(params: {
  userId: string;
  action: string;
  module: string;
  recordId?: string;
  previousValue?: any;
  newValue?: any;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      module: params.module,
      recordId: params.recordId,
      previousValue: params.previousValue ?? undefined,
      newValue: params.newValue ?? undefined,
    },
  });
}
