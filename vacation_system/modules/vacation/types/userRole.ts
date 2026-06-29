export type { vac_rol_enum as VacRol } from "@/app/generated/prisma/client";
import type { vac_rol_enum } from "@/app/generated/prisma/client";

export const VACATION_ROLES: vac_rol_enum[] = [
  "Profesor",
  "Jefe_de_Departamento",
  "Jefe_Administrativo",
  "Director_de_Escuela",
];

export const PASO_ROL: Record<number, vac_rol_enum> = {
  1: "Jefe_de_Departamento",
  2: "Jefe_Administrativo",
  3: "Director_de_Escuela",
};

export const ROL_PASO: Record<string, number> = {
  Jefe_de_Departamento: 1,
  Jefe_Administrativo: 2,
  Director_de_Escuela: 3,
};

export const TOTAL_PASOS = 3;

export const REVIEWER_ROLES: vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Jefe_Administrativo",
  "Director_de_Escuela",
];

export function hasRole(
  roles: vac_rol_enum[],
  role: vac_rol_enum
) {
  return roles.includes(role);
}

export function isReviewer(roles: vac_rol_enum[]) {
  return roles.some((role) => REVIEWER_ROLES.includes(role));
}

export function getReviewerRoles(roles: vac_rol_enum[]) {
  return REVIEWER_ROLES.filter((role) => roles.includes(role));
}

export function getExpectedRoleForStep(pasoActual: number | null) {
  return pasoActual ? PASO_ROL[pasoActual] : undefined;
}

export function isVacationRole(role: unknown): role is vac_rol_enum {
  return typeof role === "string" && VACATION_ROLES.includes(role as vac_rol_enum);
}

export function normalizeVacationRoles(roles: unknown): vac_rol_enum[] | null {
  if (!Array.isArray(roles)) return null;
  if (!roles.every(isVacationRole)) return null;
  return Array.from(new Set(roles));
}
