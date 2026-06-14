import { withAuth, unauthorizedResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { findOrCreateUser, findUserRoles } from "@/modules/vacation/repositories/userRoleRepository";
import {
  crearSolicitud,
  obtenerSolicitudesPropias,
  obtenerPendientesParaRol,
  RequestError,
} from "@/modules/vacation/services/requestService";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

const REVIEWER_ROLES: vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Director_de_Escuela",
  "Jefe_Administrativo",
];

export async function GET(request: Request) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });
    const roles = await findUserRoles(user.id);

    const reviewerRole = roles.find((r) => REVIEWER_ROLES.includes(r));
    const data = reviewerRole
      ? await obtenerPendientesParaRol(reviewerRole)
      : await obtenerSolicitudesPropias(user.id);

    return Response.json(data);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });

    const body = await request.json();
    const solicitud = await crearSolicitud(user.id, body);
    return Response.json(solicitud, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof RequestError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
