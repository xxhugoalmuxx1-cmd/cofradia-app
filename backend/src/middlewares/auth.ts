import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "./errorHandler";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    roleName: string;
    permissions: string[];
  };
}

interface TokenPayload {
  userId: string;
  roleName: string;
  permissions: string[];
}

// El rol y los permisos viajan dentro del propio token (se incluyen al
// hacer login/refresh), así que aquí NO hace falta consultar la base de
// datos en cada petición — antes se hacía y era la causa principal de la
// lentitud percibida en la app. Solo se verifica la firma del token.
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "No autenticado");
    }
    const token = header.split(" ")[1];
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;

    if (!payload.roleName) {
      // Token antiguo (de antes de este cambio), sin rol embebido: pide
      // volver a iniciar sesión para obtener un token con el nuevo formato.
      throw new ApiError(401, "Sesión caducada, vuelve a iniciar sesión");
    }

    req.user = {
      id: payload.userId,
      roleName: payload.roleName,
      permissions: payload.permissions || [],
    };
    next();
  } catch {
    next(new ApiError(401, "Token inválido o expirado"));
  }
}
