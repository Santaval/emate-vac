import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import { rechazar, ReviewError } from "@/modules/vacation/services/reviewService";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

const REVIEWER_ROLES: vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Director_de_Escuela",
  "Jefe_Administrativo",
];

export async function POST(request: Request) {
  try {
    const { user, roles } = await authenticate(request);
    const reviewerRole = roles.find((r) => REVIEWER_ROLES.includes(r));
    if (!reviewerRole) return forbiddenResponse("No tiene rol de revisor");

    const body = await request.json();
    if (!body.id_solicitud) {
      return Response.json({ error: "id_solicitud requerido" }, { status: 400 });
    }
    if (!body.comentario?.trim()) {
      return Response.json({ error: "El comentario es requerido al rechazar" }, { status: 400 });
    }

    await rechazar(Number(body.id_solicitud), user.id, reviewerRole, body.comentario);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    if (e instanceof ReviewError) {
      if (e.statusCode === 403) return forbiddenResponse(e.message);
      return Response.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
