-- CreateEnum
CREATE TYPE "vac_rol_enum" AS ENUM ('Profesor', 'Jefe de Departamento', 'Jefe Administrativo', 'Director de Escuela');

-- CreateEnum
CREATE TYPE "vac_estado_enum" AS ENUM ('Borrador', 'Enviado', 'Aprobado', 'Rechazado');

-- CreateEnum
CREATE TYPE "vac_accion_enum" AS ENUM ('Aprobado', 'Rechazado');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "id_profesor" INTEGER,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(250),
    "nombre" VARCHAR(100) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_rol" (
    "id_usuario" INTEGER NOT NULL,
    "rol" "vac_rol_enum" NOT NULL,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id_usuario","rol")
);

-- CreateTable
CREATE TABLE "vac_solicitud" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "dias_habiles" SMALLINT NOT NULL,
    "observacion" VARCHAR(300),
    "estado" "vac_estado_enum" NOT NULL DEFAULT 'Borrador',
    "paso_actual" SMALLINT,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vac_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vac_revision" (
    "id" SERIAL NOT NULL,
    "id_solicitud" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "rol_revisor" "vac_rol_enum" NOT NULL,
    "accion" "vac_accion_enum" NOT NULL,
    "comentario" VARCHAR(500),
    "fecha_revision" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vac_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- AddForeignKey
ALTER TABLE "usuario_rol" ADD CONSTRAINT "usuario_rol_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vac_solicitud" ADD CONSTRAINT "vac_solicitud_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vac_revision" ADD CONSTRAINT "vac_revision_id_solicitud_fkey" FOREIGN KEY ("id_solicitud") REFERENCES "vac_solicitud"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vac_revision" ADD CONSTRAINT "vac_revision_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
