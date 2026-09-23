-- Add editionId as nullable first so existing rows can be backfilled safely.
ALTER TABLE "Page" ADD COLUMN "editionId" TEXT;

-- Every Script that already has Pages needs at least one Edition to attach them
-- to (Graphic Novel projects never exposed the Edition concept in the UI, but
-- now every Page always belongs to exactly one Edition under the hood).
INSERT INTO "Edition" ("id", "scriptId", "number", "subtitle", "text")
SELECT substr(md5(random()::text || clock_timestamp()::text || s."id"), 1, 24), s."id", 1, NULL, ''
FROM "Script" s
WHERE EXISTS (SELECT 1 FROM "Page" p WHERE p."scriptId" = s."id")
  AND NOT EXISTS (SELECT 1 FROM "Edition" e WHERE e."scriptId" = s."id");

-- Point every existing Page at the first Edition of its Script. Page numbers
-- were already unique within the script, so they stay unique within that one
-- edition too -- no renumbering needed for this backfill.
UPDATE "Page" p
SET "editionId" = (
  SELECT e."id" FROM "Edition" e
  WHERE e."scriptId" = p."scriptId"
  ORDER BY e."number" ASC
  LIMIT 1
)
WHERE p."editionId" IS NULL;

ALTER TABLE "Page" ALTER COLUMN "editionId" SET NOT NULL;

-- Page numbers now reset per edition instead of being unique per script.
DROP INDEX IF EXISTS "Page_scriptId_number_key";
CREATE UNIQUE INDEX "Page_editionId_number_key" ON "Page"("editionId", "number");

ALTER TABLE "Page" ADD CONSTRAINT "Page_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
