import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import { obtenerPendientesParaRol } from "@/modules/vacation/services/requestService";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

const REVIEWER_ROLES: vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Director_de_Escuela",
  "Jefe_Administrativo",
];

export async function GET(request: Request) {
  try {
    const { roles } = await authenticate(request);
    const reviewerRole = roles.find((r) => REVIEWER_ROLES.includes(r));

    if (!reviewerRole) {
      return forbiddenResponse("No tiene rol de revisor");
    }

    const data = await obtenerPendientesParaRol(reviewerRole);
    return Response.json(data);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
