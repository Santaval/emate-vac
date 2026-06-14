import {
  createRequest,
  submitRequest,
  getById,
  listByUser,
  listPendingForRole,
} from "../repositories/requestRepository";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

export class RequestError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "RequestError";
  }
}

export function calcularDiasHabiles(inicio: Date, fin: Date): number {
  if (fin < inicio) return 0;
  let count = 0;
  const current = new Date(inicio);
  current.setHours(0, 0, 0, 0);
  const end = new Date(fin);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const day = current.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export async function crearSolicitud(
  id_usuario: number,
  input: {
    fecha_inicio: string;
    fecha_fin: string;
    observacion?: string;
  }
) {
  const fecha_inicio = new Date(input.fecha_inicio);
  const fecha_fin = new Date(input.fecha_fin);

  if (isNaN(fecha_inicio.getTime()) || isNaN(fecha_fin.getTime())) {
    throw new RequestError("Fechas inválidas");
  }
  if (fecha_fin < fecha_inicio) {
    throw new RequestError("La fecha de fin debe ser igual o posterior a la fecha de inicio");
  }

  const dias_habiles = calcularDiasHabiles(fecha_inicio, fecha_fin);
  if (dias_habiles === 0) {
    throw new RequestError("El rango seleccionado no contiene días hábiles");
  }

  return createRequest(id_usuario, {
    fecha_inicio,
    fecha_fin,
    dias_habiles,
    observacion: input.observacion,
  });
}

export async function enviarSolicitud(id: number, id_usuario: number) {
  const solicitud = await getById(id);
  if (!solicitud) throw new RequestError("Solicitud no encontrada", 404);
  if (solicitud.id_usuario !== id_usuario) throw new RequestError("Acceso denegado", 403);
  if (solicitud.estado !== "Borrador") {
    throw new RequestError("Solo se pueden enviar solicitudes en estado Borrador");
  }
  return submitRequest(id);
}

export async function obtenerSolicitudesPropias(id_usuario: number) {
  return listByUser(id_usuario);
}

export async function obtenerPendientesParaRol(rol: vac_rol_enum) {
  return listPendingForRole(rol);
}

export async function obtenerSolicitud(id: number) {
  const solicitud = await getById(id);
  if (!solicitud) throw new RequestError("Solicitud no encontrada", 404);
  return solicitud;
}
