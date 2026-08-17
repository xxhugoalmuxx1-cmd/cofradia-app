import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { ApiError } from "./errorHandler";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    roleId: string;
    roleName: string;
    permissions: string[];
  };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "No autenticado");
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });

    if (!user || !user.isActive) throw new ApiError(401, "Usuario no válido");

    req.user = {
      id: user.id,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
    next();
  } catch (err) {
    next(new ApiError(401, "Token inválido o expirado"));
  }
}
