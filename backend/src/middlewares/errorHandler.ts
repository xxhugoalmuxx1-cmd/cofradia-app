import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Error interno del servidor",
  });
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
