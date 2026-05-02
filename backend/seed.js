import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  await prisma.usuario.upsert({
    where: { correo: "admin@jac.com" },
    update: {},
    create: {
      correo: "admin@jac.com",
      password: hash,
      nombre: "Administrador",
      rol: "admin",
    },
  });

  console.log("Usuario admin creado");
}

main().finally(() => prisma.$disconnect());