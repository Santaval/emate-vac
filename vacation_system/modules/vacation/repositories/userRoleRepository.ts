import { prisma } from "@/lib/db";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

interface UpsertUserInput {
  username: string;
  email?: string;
  nombre: string;
}

export async function findOrCreateUser(input: UpsertUserInput) {
  return prisma.usuario.upsert({
    where: { username: input.username },
    update: {
      nombre: input.nombre,
      ...(input.email ? { email: input.email } : {}),
    },
    create: {
      username: input.username,
      email: input.email,
      nombre: input.nombre,
      activo: true,
    },
  });
}

export async function findUserById(id: number) {
  return prisma.usuario.findUnique({ where: { id } });
}

export async function findUserRoles(id_usuario: number): Promise<vac_rol_enum[]> {
  const rows = await prisma.usuario_rol.findMany({ where: { id_usuario } });
  return rows.map((r) => r.rol);
}

export async function listUsers() {
  return prisma.usuario.findMany({
    include: { usuario_rol: true },
    orderBy: { nombre: "asc" },
  });
}

export async function listActiveUsersByRole(rol: vac_rol_enum) {
  return prisma.usuario.findMany({
    where: {
      activo: true,
      email: { not: null },
      usuario_rol: { some: { rol } },
    },
    select: {
      id: true,
      username: true,
      nombre: true,
      email: true,
    },
    orderBy: { nombre: "asc" },
  });
}

export async function setUserRoles(id_usuario: number, roles: vac_rol_enum[]) {
  await prisma.usuario_rol.deleteMany({ where: { id_usuario } });
  if (roles.length > 0) {
    await prisma.usuario_rol.createMany({
      data: roles.map((rol) => ({ id_usuario, rol })),
    });
  }
}

export async function setIdProfesor(id_usuario: number, id_profesor: number) {
  return prisma.usuario.update({
    where: { id: id_usuario },
    data: { id_profesor },
  });
}

export async function setVacationDays(id_usuario: number, dias_vacaciones_disponibles: number) {
  return prisma.usuario.update({
    where: { id: id_usuario },
    data: { dias_vacaciones_disponibles },
  });
}
