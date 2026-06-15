import { withAuth, unauthorizedResponse, forbiddenResponse } from "@/lib/withAuth";
import { AuthError } from "@/lib/withAuth";
import {
  findOrCreateUser,
  findUserRoles,
  listUsers,
  setUserRoles,
  setIdProfesor,
  setVacationDays,
} from "@/modules/vacation/repositories/userRoleRepository";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });
    const roles = await findUserRoles(user.id);
    if (!roles.includes("Jefe_Administrativo")) return forbiddenResponse();

    const users = await listUsers();
    return Response.json(users);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function PATCH(request: Request) {
  try {
    const claims = await withAuth(request);
    const user = await findOrCreateUser({
      username: claims.preferred_username ?? claims.sub,
      email: claims.email,
      nombre: claims.name ?? claims.preferred_username ?? claims.sub,
    });
    const roles = await findUserRoles(user.id);
    if (!roles.includes("Jefe_Administrativo")) return forbiddenResponse();

    const body = await request.json();
    if (!body.id_usuario) {
      return Response.json({ error: "id_usuario requerido" }, { status: 400 });
    }

    if (body.roles !== undefined) {
      await setUserRoles(Number(body.id_usuario), body.roles as vac_rol_enum[]);
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
