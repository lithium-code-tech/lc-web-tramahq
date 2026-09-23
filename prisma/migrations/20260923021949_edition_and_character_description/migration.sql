-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "Edition" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_scriptId_number_key" ON "Edition"("scriptId", "number");

-- AddForeignKey
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;
