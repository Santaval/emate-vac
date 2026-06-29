CREATE TYPE "vac_periodo_estado_enum" AS ENUM ('Disponible', 'Utilizado', 'Vencido');

CREATE TABLE "vac_periodo_autorizado" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "dias_autorizados" SMALLINT NOT NULL,
    "estado" "vac_periodo_estado_enum" NOT NULL DEFAULT 'Disponible',
    "observacion" VARCHAR(300),
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vac_periodo_autorizado_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vac_periodo_autorizado_fechas_check" CHECK ("fecha_fin" >= "fecha_inicio"),
    CONSTRAINT "vac_periodo_autorizado_dias_check" CHECK ("dias_autorizados" > 0)
);

CREATE INDEX "vac_periodo_autorizado_id_usuario_fecha_inicio_idx"
ON "vac_periodo_autorizado"("id_usuario", "fecha_inicio");

ALTER TABLE "vac_periodo_autorizado"
ADD CONSTRAINT "vac_periodo_autorizado_id_usuario_fkey"
FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
