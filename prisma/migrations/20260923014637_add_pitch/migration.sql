-- AlterTable
ALTER TABLE "Script" ADD COLUMN     "pitchDraft" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pitch_scriptId_version_key" ON "Pitch"("scriptId", "version");

-- AddForeignKey
ALTER TABLE "Pitch" ADD CONSTRAINT "Pitch_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;
