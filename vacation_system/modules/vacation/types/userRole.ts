export type { vac_rol_enum as VacRol } from "@/app/generated/prisma/client";

export const PASO_ROL: Record<number, import("@/app/generated/prisma/client").vac_rol_enum> = {
  1: "Jefe_de_Departamento",
  2: "Director_de_Escuela",
  3: "Jefe_Administrativo",
};

export const ROL_PASO: Record<string, number> = {
  Jefe_de_Departamento: 1,
  Director_de_Escuela: 2,
  Jefe_Administrativo: 3,
};

export const TOTAL_PASOS = 3;
