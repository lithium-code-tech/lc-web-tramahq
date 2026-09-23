-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('GRAPHIC_NOVEL', 'SERIES');

-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "projectType" "ProjectType" NOT NULL DEFAULT 'SERIES';
