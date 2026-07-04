-- Move the "default book" flag off Book (a shared row) onto BookMember (per-user).
ALTER TABLE "BookMember" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the owner of each previously-default book keeps it as their default.
UPDATE "BookMember" m
SET "isDefault" = true
FROM "Book" b
WHERE m."bookId" = b."id"
  AND m."role" = 'owner'
  AND b."isDefault" = true;

ALTER TABLE "Book" DROP COLUMN "isDefault";
