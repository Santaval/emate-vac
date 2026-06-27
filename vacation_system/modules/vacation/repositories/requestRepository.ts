import { prisma } from "@/lib/db";
import type { vac_estado_enum, vac_rol_enum } from "@/app/generated/prisma/client";
import { PASO_ROL } from "../types/userRole";

const USUARIO_SELECT = {
  id: true,
  username: true,
  nombre: true,
  email: true,
} as const;

const CON_USUARIO_Y_REVISIONES = {
  usuario: { select: USUARIO_SELECT },
  vac_revision: { orderBy: { fecha_revision: "asc" as const } },
} as const;

export async function createRequest(
  id_usuario: number,
  data: {
    fecha_inicio: Date;
    fecha_fin: Date;
    dias_habiles: number;
    observacion?: string;
  }
) {
  return prisma.vac_solicitud.create({
    data: { id_usuario, ...data, estado: "Borrador" },
  });
}

export async function hasOverlappingRequest(
  id_usuario: number,
  fecha_inicio: Date,
  fecha_fin: Date,
  excludeId?: number
) {
  const existing = await prisma.vac_solicitud.findFirst({
    where: {
      id_usuario,
      estado: { in: ["Enviado", "Aprobado"] },
      fecha_inicio: { lte: fecha_fin },
      fecha_fin: { gte: fecha_inicio },
      ...(excludeId !== undefined && { id: { not: excludeId } }),
    },
    select: { id: true },
  });

  return existing !== null;
}

export async function submitRequest(id: number) {
  return prisma.vac_solicitud.update({
    where: { id },
    data: { estado: "Enviado", paso_actual: 1, fecha_modificacion: new Date() },
  });
}

export async function getById(id: number) {
  return prisma.vac_solicitud.findUnique({
    where: { id },
    include: CON_USUARIO_Y_REVISIONES,
  });
}

export async function listByUser(id_usuario: number) {
  return prisma.vac_solicitud.findMany({
    where: { id_usuario },
    include: CON_USUARIO_Y_REVISIONES,
    orderBy: { fecha_creacion: "desc" },
  });
}

export async function listPendingForRole(rol: vac_rol_enum) {
  const paso = Object.entries(PASO_ROL).find(([, r]) => r === rol)?.[0];
  if (!paso) return [];
  return prisma.vac_solicitud.findMany({
    where: { estado: "Enviado", paso_actual: Number(paso) },
    include: CON_USUARIO_Y_REVISIONES,
    orderBy: { fecha_creacion: "asc" },
  });
}

export async function updateStatus(
  id: number,
  estado: vac_estado_enum,
  paso_actual?: number | null
) {
  return prisma.$transaction(async (tx) => {
    const solicitud = await tx.vac_solicitud.update({
      where: { id },
      data: {
        estado,
        paso_actual: estado === "Borrador" ? null : paso_actual !== undefined ? paso_actual : undefined,
        fecha_modificacion: new Date(),
      },
    });

    if (estado === "Borrador") {
      await tx.usuario.updateMany({
        where: { id: solicitud.id_usuario },
        data: {
          dias_vacaciones_disponibles: { increment: solicitud.dias_habiles },
        },
      });
    }

    return solicitud;
  });
}