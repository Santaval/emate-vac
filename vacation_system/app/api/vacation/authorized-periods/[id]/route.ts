import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  actualizarPeriodoAutorizado,
  AuthorizedPeriodError,
  eliminarPeriodoAutorizado,
} from "@/modules/vacation/services/authorizedPeriodService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { roles } = await authenticate(request);
    const { id } = await params;
    const body = await request.json();
    const periodo = await actualizarPeriodoAutorizado(roles, Number(id), body);
    return Response.json(periodo);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof AuthorizedPeriodError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { roles } = await authenticate(request);
    const { id } = await params;
    await eliminarPeriodoAutorizado(roles, Number(id));
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof AuthorizedPeriodError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
