import { unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import { authenticate } from "@/modules/vacation/auth/authenticate";
import {
  listUsers,
  setUserRoles,
  setIdProfesor,
  setVacationDays,
} from "@/modules/vacation/repositories/userRoleRepository";
import { hasRole, normalizeVacationRoles } from "@/modules/vacation/types/userRole";

export async function GET(request: Request) {
  try {
    const { roles } = await authenticate(request);
    if (!hasRole(roles, "Jefe_Administrativo")) return forbiddenResponse();

    const users = await listUsers();
    return Response.json(users);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function PATCH(request: Request) {
  try {
    const { roles } = await authenticate(request);
    if (!hasRole(roles, "Jefe_Administrativo")) return forbiddenResponse();

    const body = await request.json();
    if (!body.id_usuario) {
      return Response.json({ error: "id_usuario requerido" }, { status: 400 });
    }

    if (body.roles !== undefined) {
      const rolesToSave = normalizeVacationRoles(body.roles);
      if (!rolesToSave) {
        return Response.json({ error: "roles inválidos" }, { status: 400 });
      }
      await setUserRoles(Number(body.id_usuario), rolesToSave);
    }
    if (body.id_profesor !== undefined) {
      await setIdProfesor(Number(body.id_usuario), Number(body.id_profesor));
    }
    if (body.dias_vacaciones_disponibles !== undefined) {
      const days = Number(body.dias_vacaciones_disponibles);
      if (!Number.isInteger(days) || days < 0) {
        return Response.json({ error: "dias_vacaciones_disponibles inválido" }, { status: 400 });
      }
      await setVacationDays(Number(body.id_usuario), days);
    }

    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
