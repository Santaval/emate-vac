import { prisma } from "@/lib/db";
import type { vac_estado_enum } from "@/app/generated/prisma/client";

const USUARIO_SELECT = {
  id: true,
  username: true,
  nombre: true,
  email: true,
} as const;

interface HistoryFilters {
  id_usuario?: number;
  estado?: vac_estado_enum;
  fecha_inicio?: Date;
  fecha_fin?: Date;
}

export async function listHistory(filters: HistoryFilters = {}) {
  return prisma.vac_solicitud.findMany({
    where: {
      estado: filters.estado ?? { in: ["Aprobado", "Rechazado"] },
      ...(filters.id_usuario ? { id_usuario: filters.id_usuario } : {}),
      ...(filters.fecha_inicio
        ? { fecha_inicio: { gte: filters.fecha_inicio } }
        : {}),
      ...(filters.fecha_fin
        ? { fecha_fin: { lte: filters.fecha_fin } }
        : {}),
    },
    include: {
      usuario: { select: USUARIO_SELECT },
      vac_revision: {
        orderBy: { fecha_revision: "asc" },
        include: { usuario: { select: USUARIO_SELECT } },
      },
    },
    orderBy: { fecha_modificacion: "desc" },
  });
}
