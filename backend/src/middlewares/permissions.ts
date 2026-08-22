import { Response, NextFunction } from "express";
import { AuthedRequest } from "./auth";
import { ApiError } from "./errorHandler";

export function requirePermission(code: string) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "No autenticado"));
    if (req.user.roleName === "admin") return next();
    if (!req.user.permissions.includes(code)) {
      return next(new ApiError(403, `No tienes permiso: ${code}`));
    }
    next();
  };
}

// La gestión de usuarios (crear, editar, desactivar) es exclusiva del
// administrador, sin importar qué permisos individuales tenga asignados
// el resto de roles en la base de datos.
export function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(new ApiError(401, "No autenticado"));
  if (req.user.roleName !== "admin") {
    return next(new ApiError(403, "Solo un administrador puede gestionar usuarios"));
  }
  next();
}
