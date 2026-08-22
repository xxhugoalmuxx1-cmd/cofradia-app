import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { ApiError } from "../../middlewares/errorHandler";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user || !user.isActive) throw new ApiError(401, "Credenciales inválidas");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Credenciales inválidas");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // El rol y los permisos se guardan dentro del propio token: así, en cada
  // petición posterior, no hace falta volver a consultar la base de datos
  // para saber qué puede hacer el usuario (antes se hacía en CADA petición,
  // lo cual era la causa principal de la lentitud notada en la app).
  const tokenPayload = {
    userId: user.id,
    roleName: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.code),
  };

  const accessToken = jwt.sign(tokenPayload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId: user.id }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as jwt.SignOptions);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role.name },
  };
}

export async function refresh(token: string) {
  try {
    const payload = jwt.verify(token, env.jwtRefreshSecret) as { userId: string };

    // Al renovar el token sí se refresca el rol/permisos desde la base de
    // datos (por si un admin los cambió mientras tanto), pero esto solo
    // ocurre cada 15 minutos, no en cada clic.
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!user || !user.isActive) throw new ApiError(401, "Usuario no válido");

    const accessToken = jwt.sign(
      {
        userId: user.id,
        roleName: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.code),
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn } as jwt.SignOptions
    );
    return { accessToken };
  } catch {
    throw new ApiError(401, "Refresh token inválido");
  }
}
