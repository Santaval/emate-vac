import { prisma } from "@/lib/db";
import { getById } from "../repositories/requestRepository";
import { getExpectedRoleForStep, TOTAL_PASOS } from "../types/userRole";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

export class ReviewError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = "ReviewError";
  }
}

function obtenerRolRevisorParaPaso(
  pasoActual: number | null,
  rolesRevisor: vac_rol_enum[]
) {
  if (!pasoActual) throw new ReviewError("La solicitud no está en revisión");
  const rolEsperado = getExpectedRoleForStep(pasoActual);
  if (!rolEsperado || !rolesRevisor.includes(rolEsperado)) {
    throw new ReviewError("No tiene el rol requerido para este paso de revisión", 403);
  }
  return rolEsperado;
}

export async function aprobar(
  id_solicitud: number,
  id_usuario_revisor: number,
  rolesRevisor: vac_rol_enum[],
  comentario?: string
) {
  const solicitud = await getById(id_solicitud);
  if (!solicitud) throw new ReviewError("Solicitud no encontrada", 404);
  if (solicitud.estado !== "Enviado") throw new ReviewError("La solicitud no está en estado Enviado");

  const rolRevisor = obtenerRolRevisorParaPaso(solicitud.paso_actual, rolesRevisor);

  const esUltimoPaso = solicitud.paso_actual === TOTAL_PASOS;

  await prisma.$transaction(async (tx) => {
    await tx.vac_revision.create({
      data: {
        id_solicitud,
        id_usuario: id_usuario_revisor,
        rol_revisor: rolRevisor,
        accion: "Aprobado",
        comentario: comentario ?? null,
      },
    });

    await tx.vac_solicitud.update({
      where: { id: id_solicitud },
      data: {
        estado: esUltimoPaso ? "Aprobado" : "Enviado",
        paso_actual: esUltimoPaso ? null : (solicitud.paso_actual! + 1),
        fecha_modificacion: new Date(),
      },
    });
  });

  return { aprobadoFinal: esUltimoPaso };
}

export async function rechazar(
  id_solicitud: number,
  id_usuario_revisor: number,
  rolesRevisor: vac_rol_enum[],
  comentario: string
) {
  if (!comentario?.trim()) {
    throw new ReviewError("El comentario es requerido al rechazar una solicitud");
  }

  const solicitud = await getById(id_solicitud);
  if (!solicitud) throw new ReviewError("Solicitud no encontrada", 404);
  if (solicitud.estado !== "Enviado") throw new ReviewError("La solicitud no está en estado Enviado");

  const rolRevisor = obtenerRolRevisorParaPaso(solicitud.paso_actual, rolesRevisor);

  await prisma.$transaction(async (tx) => {
    await tx.vac_revision.create({
      data: {
        id_solicitud,
        id_usuario: id_usuario_revisor,
        rol_revisor: rolRevisor,
        accion: "Rechazado",
        comentario,
      },
    });
    await tx.vac_solicitud.update({
      where: { id: id_solicitud },
      data: { estado: "Rechazado", paso_actual: null, fecha_modificacion: new Date() },
    });
    const updated = await tx.usuario.updateMany({
      where: {
        id: solicitud.id_usuario,
        dias_vacaciones_disponibles: { gte: 0 },
      },
      data: {
        dias_vacaciones_disponibles: {
          increment: solicitud.dias_habiles,
        },
      },
    });

    if (updated.count === 0) {
      throw new ReviewError("Error al restaurar días disponibles");
    }
  });
}
