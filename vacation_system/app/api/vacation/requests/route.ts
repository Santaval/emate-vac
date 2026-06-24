import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  crearSolicitud,
  obtenerSolicitudesPropias,
  obtenerPendientesParaRoles,
  RequestError,
  validarPuedeCrearSolicitud,
} from "@/modules/vacation/services/requestService";
import { hasRole, isReviewer } from "@/modules/vacation/types/userRole";

export async function GET(request: Request) {
  try {
    const { user, roles } = await authenticate(request);

    if (hasRole(roles, "Profesor")) {
      const data = await obtenerSolicitudesPropias(user.id);
      return Response.json(data);
    }

    if (isReviewer(roles)) {
      const data = await obtenerPendientesParaRoles(roles);
      return Response.json(data);
    }

    return forbiddenResponse();
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    const { user, roles } = await authenticate(request);
    validarPuedeCrearSolicitud(roles);

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
