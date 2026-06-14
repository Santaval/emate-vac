import { listHistory } from "../repositories/historyRepository";
import type { vac_estado_enum } from "@/app/generated/prisma/client";

export async function obtenerHistorial(filters: {
  id_usuario?: number;
  estado?: vac_estado_enum;
  fecha_inicio?: string;
  fecha_fin?: string;
}) {
  return listHistory({
    id_usuario: filters.id_usuario,
    estado: filters.estado,
    fecha_inicio: filters.fecha_inicio ? new Date(filters.fecha_inicio) : undefined,
    fecha_fin: filters.fecha_fin ? new Date(filters.fecha_fin) : undefined,
  });
}
