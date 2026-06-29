import { prisma } from "@/lib/db";

const USER_SELECT = {
  id: true,
  username: true,
  nombre: true,
  email: true,
  dias_vacaciones_disponibles: true,
} as const;

export async function listReportUsers() {
  return prisma.usuario.findMany({
    where: { activo: true },
    select: {
      ...USER_SELECT,
      usuario_rol: true,
      vac_solicitud: {
        select: {
          id: true,
          estado: true,
          fecha_inicio: true,
          fecha_fin: true,
          dias_habiles: true,
          fecha_modificacion: true,
        },
      },
      vac_periodo_autorizado: {
        select: {
          id: true,
          estado: true,
          fecha_inicio: true,
          fecha_fin: true,
          dias_autorizados: true,
        },
      },
    },
    orderBy: { nombre: "asc" },
  });
}

export async function listReportRequests(filters: {
  fecha_inicio?: Date;
  fecha_fin?: Date;
} = {}) {
  return prisma.vac_solicitud.findMany({
    where: {
      ...(filters.fecha_inicio ? { fecha_inicio: { gte: filters.fecha_inicio } } : {}),
      ...(filters.fecha_fin ? { fecha_fin: { lte: filters.fecha_fin } } : {}),
    },
    include: {
      usuario: { select: USER_SELECT },
    },
    orderBy: [{ fecha_inicio: "desc" }, { id: "desc" }],
  });
}
