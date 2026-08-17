import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  "members.read", "members.create", "members.update",
  "finance.read", "finance.create", "finance.update",
  "cash.read", "cash.create", "cash.close",
  "bank.read", "bank.create", "bank.update",
  "sales.read", "sales.create", "sales.update",
  "products.read", "products.create", "products.update",
  "stock.read", "stock.update",
  "lottery.read", "lottery.create", "lottery.update",
  "fees.read", "fees.create",
  "donations.read", "donations.create",
  "events.read", "events.create", "events.update",
  "documents.read", "documents.create",
  "reports.read",
  "audit.read",
  "users.read", "users.create", "users.update",
];

const VIEWER_PERMISSIONS = ["members.read", "events.read"];

async function main() {
  console.log("Creando permisos...");
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: {},
        create: { code, module: code.split(".")[0] },
      })
    )
  );

  console.log("Creando roles...");
  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Administración técnica total" },
  });

  const boardRole = await prisma.role.upsert({
    where: { name: "board_member" },
    update: {},
    create: { name: "board_member", description: "Miembro de la junta" },
  });

  const viewerRole = await prisma.role.upsert({
    where: { name: "viewer" },
    update: {},
    create: { name: "viewer", description: "Usuario de consulta" },
  });

  // El rol admin tiene acceso total por lógica de aplicación (ver requirePermission),
  // pero igualmente le asignamos todos los permisos por consistencia de datos.
  for (const perm of permissionRecords) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: boardRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: boardRole.id, permissionId: perm.id },
    });
  }

  for (const code of VIEWER_PERMISSIONS) {
    const perm = permissionRecords.find((p) => p.code === code)!;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: viewerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: viewerRole.id, permissionId: perm.id },
    });
  }

  console.log("Creando usuario administrador inicial...");
  const passwordHash = await bcrypt.hash("CambiaEstaClave123!", 10);
  await prisma.user.upsert({
    where: { email: "admin@cofradia.local" },
    update: {},
    create: {
      fullName: "Administrador",
      email: "admin@cofradia.local",
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log("Creando caja principal...");
  await prisma.cashRegister.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000001", name: "Caja principal", currentBalance: 0 },
  });

  console.log("Seed completado.");
  console.log("Usuario admin: admin@cofradia.local / CambiaEstaClave123!  -> CAMBIAR ESTA CONTRASEÑA");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
