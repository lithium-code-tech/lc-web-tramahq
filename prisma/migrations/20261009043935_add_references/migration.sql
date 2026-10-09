-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "characterName" TEXT,
    "editionNumber" INTEGER,
    "pageNumber" INTEGER,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "thumbMimeType" TEXT NOT NULL,
    "thumb" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reference_scriptId_idx" ON "Reference"("scriptId");

-- AddForeignKey
ALTER TABLE "Reference" ADD CONSTRAINT "Reference_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Script"("id") ON DELETE CASCADE ON UPDATE CASCADE;
