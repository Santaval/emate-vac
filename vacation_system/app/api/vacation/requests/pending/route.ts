import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import { obtenerPendientesParaRoles } from "@/modules/vacation/services/requestService";
import { isReviewer } from "@/modules/vacation/types/userRole";

export async function GET(request: Request) {
  try {
    const { roles } = await authenticate(request);

    if (!isReviewer(roles)) {
      return forbiddenResponse("No tiene rol de revisor");
    }

    const data = await obtenerPendientesParaRoles(roles);
    return Response.json(data);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
