import { withAuth } from "@/lib/withAuth";
import type { VacationTokenPayload } from "@/lib/auth";
import {
  findOrCreateUser,
  findUserRoles,
  setUserRoles,
} from "@/modules/vacation/repositories/userRoleRepository";
import { mapSacRoles, tokenCarriesRoleInfo } from "@/modules/vacation/auth/roleMapping";
import type { usuario } from "@/app/generated/prisma/client";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

export interface AuthContext {
  claims: VacationTokenPayload;
  user: usuario;
  roles: vac_rol_enum[];
}

function sameRoleSet(a: vac_rol_enum[], b: vac_rol_enum[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((role) => setA.has(role));
}

/**
 * Authenticates the request, ensures the user exists, and syncs the user's
 * roles from the SAC token into the DB (the token is the source of truth).
 * Roles are only written when they differ from what's stored, to avoid
 * needless usuario_rol churn on every request.
 */
export async function authenticate(request: Request): Promise<AuthContext> {
  const claims = await withAuth(request);
  const user = await findOrCreateUser({
    username: claims.preferred_username ?? claims.sub,
    email: claims.email,
    nombre: claims.name ?? claims.preferred_username ?? claims.sub,
  });

  const current = await findUserRoles(user.id);

  // The SAC token is the source of truth, but only when it actually carries
  // role info. Otherwise (e.g. a standalone /api/dev/login token) keep the
  // roles already in the DB rather than wiping them.
  if (!tokenCarriesRoleInfo(claims)) {
    return { claims, user, roles: current };
  }

  const roles = mapSacRoles(claims);
  if (!sameRoleSet(current, roles)) {
    await setUserRoles(user.id, roles);
  }

  return { claims, user, roles };
}
