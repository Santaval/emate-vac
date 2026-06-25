import { prisma } from "@/lib/db";
import type { vac_periodo_estado_enum } from "@/app/generated/prisma/client";

const USUARIO_SELECT = {
  id: true,
  username: true,
  nombre: true,
  email: true,
} as const;

const CON_USUARIO = {
  usuario: { select: USUARIO_SELECT },
} as const;

export async function listAuthorizedPeriods(id_usuario?: number) {
  return prisma.vac_periodo_autorizado.findMany({
    where: id_usuario ? { id_usuario } : undefined,
    include: CON_USUARIO,
    orderBy: [{ fecha_inicio: "desc" }, { id: "desc" }],
  });
}

export async function findAvailablePeriodCoveringRange(
  id_usuario: number,
  fecha_inicio: Date,
  fecha_fin: Date
) {
  return prisma.vac_periodo_autorizado.findFirst({
    where: {
      id_usuario,
      estado: "Disponible",
      fecha_inicio: { lte: fecha_inicio },
      fecha_fin: { gte: fecha_fin },
    },
    include: CON_USUARIO,
    orderBy: [{ fecha_inicio: "asc" }, { id: "asc" }],
  });
}

export async function createAuthorizedPeriod(data: {
  id_usuario: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  dias_autorizados: number;
  estado: vac_periodo_estado_enum;
  observacion?: string;
}) {
  return prisma.vac_periodo_autorizado.create({
    data,
    include: CON_USUARIO,
  });
}

export async function getAuthorizedPeriodById(id: number) {
  return prisma.vac_periodo_autorizado.findUnique({
    where: { id },
    include: CON_USUARIO,
  });
}

export async function updateAuthorizedPeriod(
  id: number,
  data: {
    fecha_inicio?: Date;
    fecha_fin?: Date;
    dias_autorizados?: number;
    estado?: vac_periodo_estado_enum;
    observacion?: string | null;
  }
) {
  return prisma.vac_periodo_autorizado.update({
    where: { id },
    data: { ...data, fecha_modificacion: new Date() },
    include: CON_USUARIO,
  });
}

export async function deleteAuthorizedPeriod(id: number) {
  return prisma.vac_periodo_autorizado.delete({ where: { id } });
}
