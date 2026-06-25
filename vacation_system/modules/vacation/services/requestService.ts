import {
  createRequest,
  submitRequest,
  getById,
  listByUser,
  listPendingForRoles,
  hasOverlappingRequest,
  updateStatus,
} from "../repositories/requestRepository";
import {
  CreateRequestValidationError,
  validateCreateRequestInput,
} from "../validators/createRequestSchema";
import { calcularDiasHabiles } from "./calendarService";
import { findAvailablePeriodCoveringRange } from "../repositories/authorizedPeriodRepository";
import { findUserById } from "../repositories/userRoleRepository";
import type { vac_rol_enum, vac_estado_enum } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getReviewerRoles, hasRole, isReviewer } from "../types/userRole";


export class RequestError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "RequestError";
  }
}

export async function crearSolicitud(
  id_usuario: number,
  input: unknown
) {
  let validatedInput: ReturnType<typeof validateCreateRequestInput>;
  try {
    validatedInput = validateCreateRequestInput(input);
  } catch (e) {
    if (e instanceof CreateRequestValidationError) {
      throw new RequestError(e.message);
    }
    throw e;
  }

  const { fecha_inicio, fecha_fin, observacion } = validatedInput;

  const dias_habiles = calcularDiasHabiles(fecha_inicio, fecha_fin);
  if (dias_habiles === 0) {
    throw new RequestError("El rango seleccionado no contiene días hábiles");
  }

  const user = await findUserById(id_usuario);
  if (!user) throw new RequestError("Usuario no encontrado", 404);

  const authorizedPeriod = await findAvailablePeriodCoveringRange(id_usuario, fecha_inicio, fecha_fin);
  if (!authorizedPeriod) {
    throw new RequestError("El rango seleccionado debe estar dentro de un periodo autorizado disponible");
  }

  if (dias_habiles > user.dias_vacaciones_disponibles) {
    throw new RequestError("La solicitud supera los días de vacaciones disponibles");
  }
  if (dias_habiles > authorizedPeriod.dias_autorizados) {
    throw new RequestError("La solicitud supera los días autorizados para el periodo seleccionado");
  }

  const overlaps = await hasOverlappingRequest(id_usuario, fecha_inicio, fecha_fin);
  if (overlaps) {
    throw new RequestError("Ya existe una solicitud para ese rango de fechas");
  }

  return createRequest(id_usuario, {
    fecha_inicio,
    fecha_fin,
    dias_habiles,
    observacion,
  });
}

export async function enviarSolicitud(id: number, id_usuario: number) {
  const solicitud = await getById(id);
  if (!solicitud) throw new RequestError("Solicitud no encontrada", 404);
  if (solicitud.id_usuario !== id_usuario) throw new RequestError("Acceso denegado", 403);
  if (solicitud.estado !== "Borrador") {
    throw new RequestError("Solo se pueden enviar solicitudes en estado Borrador");
  }
  const overlaps = await hasOverlappingRequest(id_usuario, solicitud.fecha_inicio, solicitud.fecha_fin, id);
  if (overlaps) {
    throw new RequestError("Ya existe una solicitud para ese rango de fechas");
  }
  await prisma.$transaction(async (tx) => { 
    const updated = await tx.usuario.updateMany({
      where: {
        id: solicitud.id_usuario,
        dias_vacaciones_disponibles: { gte: solicitud.dias_habiles },
      },
      data: {
        dias_vacaciones_disponibles: {
          decrement: solicitud.dias_habiles,
        },
      },
    });

    if (updated.count === 0) {
      throw new RequestError("El solicitante no tiene suficientes días disponibles");
    }

  })
  return submitRequest(id);
}

export async function obtenerSolicitudesPropias(id_usuario: number) {
  return listByUser(id_usuario);
}

export async function obtenerPendientesParaRoles(roles: vac_rol_enum[]) {
  return listPendingForRoles(getReviewerRoles(roles));
}

export function validarPuedeCrearSolicitud(roles: vac_rol_enum[]) {
  if (!hasRole(roles, "Profesor")) {
    throw new RequestError("Solo el rol Profesor puede crear solicitudes", 403);
  }
}

export async function obtenerSolicitud(
  id: number,
  id_usuario: number,
  roles: vac_rol_enum[]
) {
  const solicitud = await getById(id);
  if (!solicitud) throw new RequestError("Solicitud no encontrada", 404);
  if (solicitud.id_usuario !== id_usuario && !isReviewer(roles)) {
    throw new RequestError("Acceso denegado", 403);
  }
  return solicitud;
}

export async function actualizarEstado(id: number, estado: vac_estado_enum, paso_actual?: number | null) {
  const solicitud = await updateStatus(id, estado, paso_actual);
  if (!solicitud) throw new RequestError("Solicitud no encontrada", 404);
  return solicitud;
}