export type { vac_rol_enum as VacRol } from "@/app/generated/prisma/client";

export const PASO_ROL: Record<number, import("@/app/generated/prisma/client").vac_rol_enum> = {
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

export const REVIEWER_ROLES: import("@/app/generated/prisma/client").vac_rol_enum[] = [
  "Jefe_de_Departamento",
  "Jefe_Administrativo",
  "Director_de_Escuela",
];
