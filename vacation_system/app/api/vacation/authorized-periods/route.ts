import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  AuthorizedPeriodError,
  crearPeriodoAutorizado,
  obtenerPeriodosAutorizados,
} from "@/modules/vacation/services/authorizedPeriodService";

export async function GET(request: Request) {
  try {
    const { user, roles } = await authenticate(request);
    const { searchParams } = new URL(request.url);
    const idUsuarioParam = searchParams.get("id_usuario");
    const id_usuario = idUsuarioParam ? Number(idUsuarioParam) : undefined;

    if (idUsuarioParam && !Number.isInteger(id_usuario)) {
      return Response.json({ error: "id_usuario inválido" }, { status: 400 });
    }

    const data = await obtenerPeriodosAutorizados({ id: user.id, roles }, id_usuario);
    return Response.json(data);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof AuthorizedPeriodError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function POST(request: Request) {
  try {
    const { roles } = await authenticate(request);
    const body = await request.json();
    const periodo = await crearPeriodoAutorizado(roles, body);
    return Response.json(periodo, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof AuthorizedPeriodError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
