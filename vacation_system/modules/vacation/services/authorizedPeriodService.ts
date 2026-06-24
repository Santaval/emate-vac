import type { vac_periodo_estado_enum, vac_rol_enum } from "@/app/generated/prisma/client";
import {
  createAuthorizedPeriod,
  deleteAuthorizedPeriod,
  getAuthorizedPeriodById,
  listAuthorizedPeriods,
  updateAuthorizedPeriod,
} from "../repositories/authorizedPeriodRepository";
import { findUserById } from "../repositories/userRoleRepository";
import { hasRole } from "../types/userRole";

export class AuthorizedPeriodError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "AuthorizedPeriodError";
  }
}

const PERIOD_STATUSES: vac_periodo_estado_enum[] = ["Disponible", "Utilizado", "Vencido"];

function parseDate(value: unknown, field: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AuthorizedPeriodError(`${field} debe tener formato YYYY-MM-DD`);
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new AuthorizedPeriodError(`${field} inválida`);
  }

  return date;
}

function parseOptionalDate(value: unknown, field: string) {
  return value === undefined ? undefined : parseDate(value, field);
}

function parseDays(value: unknown) {
  const days = Number(value);
  if (!Number.isInteger(days) || days <= 0) {
    throw new AuthorizedPeriodError("dias_autorizados debe ser un entero mayor que 0");
  }
  return days;
}

function parseStatus(value: unknown): vac_periodo_estado_enum {
  if (value === undefined) return "Disponible";
  if (typeof value === "string" && PERIOD_STATUSES.includes(value as vac_periodo_estado_enum)) {
    return value as vac_periodo_estado_enum;
  }
  throw new AuthorizedPeriodError("estado inválido");
}

function parseOptionalStatus(value: unknown) {
  return value === undefined ? undefined : parseStatus(value);
}

function parseObservation(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > 300) {
    throw new AuthorizedPeriodError("observacion debe tener máximo 300 caracteres");
  }
  return value;
}

function requireAdmin(roles: vac_rol_enum[]) {
  if (!hasRole(roles, "Jefe_Administrativo")) {
    throw new AuthorizedPeriodError("Solo Jefatura Administrativa puede gestionar periodos", 403);
  }
}

function parseBody(input: unknown) {
  if (!input || typeof input !== "object") {
    throw new AuthorizedPeriodError("Cuerpo de solicitud inválido");
  }
  return input as Record<string, unknown>;
}

export async function obtenerPeriodosAutorizados(
  requester: { id: number; roles: vac_rol_enum[] },
  id_usuario?: number
) {
  if (hasRole(requester.roles, "Jefe_Administrativo")) {
    return listAuthorizedPeriods(id_usuario);
  }

  return listAuthorizedPeriods(requester.id);
}

export async function crearPeriodoAutorizado(roles: vac_rol_enum[], input: unknown) {
  requireAdmin(roles);

  const body = parseBody(input);
  const id_usuario = Number(body.id_usuario);
  if (!Number.isInteger(id_usuario)) {
    throw new AuthorizedPeriodError("id_usuario requerido");
  }

  const user = await findUserById(id_usuario);
  if (!user) throw new AuthorizedPeriodError("Usuario no encontrado", 404);

  const fecha_inicio = parseDate(body.fecha_inicio, "fecha_inicio");
  const fecha_fin = parseDate(body.fecha_fin, "fecha_fin");
  if (fecha_fin < fecha_inicio) {
    throw new AuthorizedPeriodError("fecha_fin debe ser mayor o igual a fecha_inicio");
  }

  return createAuthorizedPeriod({
    id_usuario,
    fecha_inicio,
    fecha_fin,
    dias_autorizados: parseDays(body.dias_autorizados),
    estado: parseStatus(body.estado),
    observacion: parseObservation(body.observacion),
  });
}

export async function actualizarPeriodoAutorizado(
  roles: vac_rol_enum[],
  id: number,
  input: unknown
) {
  requireAdmin(roles);
  const existing = await getAuthorizedPeriodById(id);
  if (!existing) throw new AuthorizedPeriodError("Periodo autorizado no encontrado", 404);

  const body = parseBody(input);
  const fecha_inicio = parseOptionalDate(body.fecha_inicio, "fecha_inicio");
  const fecha_fin = parseOptionalDate(body.fecha_fin, "fecha_fin");
  const nextStart = fecha_inicio ?? existing.fecha_inicio;
  const nextEnd = fecha_fin ?? existing.fecha_fin;

  if (nextEnd < nextStart) {
    throw new AuthorizedPeriodError("fecha_fin debe ser mayor o igual a fecha_inicio");
  }

  return updateAuthorizedPeriod(id, {
    ...(fecha_inicio ? { fecha_inicio } : {}),
    ...(fecha_fin ? { fecha_fin } : {}),
    ...(body.dias_autorizados !== undefined ? { dias_autorizados: parseDays(body.dias_autorizados) } : {}),
    ...(body.estado !== undefined ? { estado: parseOptionalStatus(body.estado) } : {}),
    ...(body.observacion !== undefined ? { observacion: parseObservation(body.observacion) ?? null } : {}),
  });
}

export async function eliminarPeriodoAutorizado(roles: vac_rol_enum[], id: number) {
  requireAdmin(roles);
  const existing = await getAuthorizedPeriodById(id);
  if (!existing) throw new AuthorizedPeriodError("Periodo autorizado no encontrado", 404);

  await deleteAuthorizedPeriod(id);
}
