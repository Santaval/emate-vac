-- AlterEnum: add lifecycle action values to vac_accion_enum
ALTER TYPE "vac_accion_enum" ADD VALUE 'Creado';
ALTER TYPE "vac_accion_enum" ADD VALUE 'Enviado';
ALTER TYPE "vac_accion_enum" ADD VALUE 'Editado';
ALTER TYPE "vac_accion_enum" ADD VALUE 'Cancelado';
