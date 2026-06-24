import { unauthorizedResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import { obtenerHistorial } from "@/modules/vacation/services/historyService";
import type { vac_estado_enum, vac_rol_enum } from "@/app/generated/prisma/client";

const REVIEWER_ROLES: vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Director_de_Escuela",
  "Jefe_Administrativo",
];

export async function GET(request: Request) {
  try {
    const { user, roles } = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const isReviewer = roles.some((r) => REVIEWER_ROLES.includes(r));

    const historial = await obtenerHistorial({
      // Professors only see their own history; reviewers see all
      id_usuario: isReviewer ? undefined : user.id,
      estado: (searchParams.get("estado") as vac_estado_enum) || undefined,
      fecha_inicio: searchParams.get("fecha_inicio") || undefined,
      fecha_fin: searchParams.get("fecha_fin") || undefined,
    });

    return Response.json(historial);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
