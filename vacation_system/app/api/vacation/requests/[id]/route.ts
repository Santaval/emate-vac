import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  obtenerSolicitud,
  enviarSolicitud,
  RequestError,
} from "@/modules/vacation/services/requestService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    await authenticate(request);

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
    const { user } = await authenticate(request);

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
