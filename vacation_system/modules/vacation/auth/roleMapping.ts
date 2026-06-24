import type { VacationTokenPayload } from "@/lib/auth";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

// Keycloak client whose resource_access roles drive the vacation module.
export const SAC_KEYCLOAK_CLIENT_ID = process.env.SAC_KEYCLOAK_CLIENT_ID ?? "sac-mate";

// SAC (Keycloak) role -> internal vacation role.
// Primary mapping source: token.resource_access[clientId].roles.
export const SAC_ROLE_TO_VACATION: Record<string, vac_rol_enum> = {
  PROFESOR: "Profesor",
  JEFATURA_ADMIN: "Jefe_Administrativo",
  JEFATURA_DEPARTAMENTO: "Jefe_de_Departamento",
  DIRECTOR: "Director_de_Escuela",
};

// Dev fallback: SAC dev-login mints preferred_username as
// `dev-${role.toLowerCase().replace(/_/g, "-")}`. Used only when no
// resource_access role maps (e.g. local SAC picker before Keycloak roles exist).
export const USERNAME_TO_VACATION: Record<string, vac_rol_enum> = {
  "dev-profesor": "Profesor",
  "dev-jefatura-admin": "Jefe_Administrativo",
  "dev-jefatura-departamento": "Jefe_de_Departamento",
  "dev-director": "Director_de_Escuela",
};

/**
 * Whether the token carries any SAC role signal. Used to decide if the token
 * should be treated as the source of truth for roles. When false (e.g. a token
 * minted by the standalone /api/dev/login flow, which sets roles in the DB
 * directly and carries no resource_access), we leave existing DB roles alone
 * instead of overwriting them with an empty set.
 */
export function tokenCarriesRoleInfo(payload: VacationTokenPayload): boolean {
  if (payload.resource_access?.[SAC_KEYCLOAK_CLIENT_ID]) return true;
  return Boolean(payload.preferred_username && USERNAME_TO_VACATION[payload.preferred_username]);
}

/**
 * Translates a SAC/Keycloak token into internal vacation roles.
 * Reads resource_access[clientId].roles first; if none map, falls back to the
 * preferred_username dev convention. Unknown roles are ignored.
 */
export function mapSacRoles(payload: VacationTokenPayload): vac_rol_enum[] {
  const sacRoles = payload.resource_access?.[SAC_KEYCLOAK_CLIENT_ID]?.roles ?? [];
  const mapped = sacRoles
    .map((role) => SAC_ROLE_TO_VACATION[role])
    .filter((role): role is vac_rol_enum => Boolean(role));

  if (mapped.length > 0) {
    return Array.from(new Set(mapped));
  }

  const fromUsername = payload.preferred_username
    ? USERNAME_TO_VACATION[payload.preferred_username]
    : undefined;
  return fromUsername ? [fromUsername] : [];
}
