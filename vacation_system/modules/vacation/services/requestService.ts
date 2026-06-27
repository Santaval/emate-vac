import {
  createRequest,
  submitRequest,
  getById,
  listByUser,
  listPendingForRole,
  hasOverlappingRequest,
} from "../repositories/requestRepository";
import {
  CreateRequestValidationError,
  validateCreateRequestInput,
} from "../validators/createRequestSchema";
import { calcularDiasHabiles } from "./calendarService";
import { findUserById } from "../repositories/userRoleRepository";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

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
  if (dias_habiles > user.dias_vacaciones_disponibles) {
    throw new RequestError("La solicitud supera los días de vacaciones disponibles");
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
  return submitRequest(id, id_usuario);
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
