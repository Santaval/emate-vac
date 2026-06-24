import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import { aprobar, ReviewError } from "@/modules/vacation/services/reviewService";
import { isReviewer } from "@/modules/vacation/types/userRole";

export async function POST(request: Request) {
  try {
    const { user, roles } = await authenticate(request);
    if (!isReviewer(roles)) return forbiddenResponse("No tiene rol de revisor");

    const body = await request.json();
    if (!body.id_solicitud) {
      return Response.json({ error: "id_solicitud requerido" }, { status: 400 });
    }

    const result = await aprobar(Number(body.id_solicitud), user.id, roles, body.comentario);
    return Response.json(result);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof ReviewError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
