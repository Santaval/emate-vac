import { withAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { findOrCreateUser } from "@/modules/vacation/repositories/userRoleRepository";
import {
  obtenerSolicitud,
  enviarSolicitud,
  RequestError,
} from "@/modules/vacation/services/requestService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const claims = await withAuth(request);
    await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });

    const { id } = await params;
    const solicitud = await obtenerSolicitud(Number(id));
    return Response.json(solicitud);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof RequestError) {
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });

    const { id } = await params;
    const body = await request.json();

    if (body.action === "submit") {
      const updated = await enviarSolicitud(Number(id), user.id);
      return Response.json(updated);
    }

    return Response.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof RequestError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
