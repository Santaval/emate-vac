export type { vac_solicitud, vac_revision } from "@/app/generated/prisma/client";

export interface SolicitudConRevisiones {
  id: number;
  id_usuario: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  dias_habiles: number;
  observacion: string | null;
  estado: import("@/app/generated/prisma/client").vac_estado_enum;
  paso_actual: number | null;
  fecha_creacion: Date;
  fecha_modificacion: Date;
  usuario: {
    id: number;
    username: string;
    nombre: string;
    email: string | null;
  };
  vac_revision: import("@/app/generated/prisma/client").vac_revision[];
}
