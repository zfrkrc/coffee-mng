-- Backfill NULL branch_slug -> '' (empty string = "no branch") so the
-- unique indexes become effective (Postgres treats NULLs as distinct).
UPDATE "cafe_menu_items" SET "branch_slug" = '' WHERE "branch_slug" IS NULL;
UPDATE "cafe_tables" SET "branch_slug" = '' WHERE "branch_slug" IS NULL;
UPDATE "cafe_inventory" SET "branch_slug" = '' WHERE "branch_slug" IS NULL;

-- DropIndex
DROP INDEX "cafe_menu_items_member_id_branch_slug_id_key";

-- AlterTable
ALTER TABLE "cafe_inventory" ALTER COLUMN "branch_slug" SET NOT NULL,
ALTER COLUMN "branch_slug" SET DEFAULT '';

-- AlterTable
ALTER TABLE "cafe_menu_items" DROP CONSTRAINT "cafe_menu_items_pkey",
ALTER COLUMN "branch_slug" SET NOT NULL,
ALTER COLUMN "branch_slug" SET DEFAULT '',
ADD CONSTRAINT "cafe_menu_items_pkey" PRIMARY KEY ("member_id", "branch_slug", "id");

-- AlterTable
ALTER TABLE "cafe_tables" ALTER COLUMN "branch_slug" SET NOT NULL,
ALTER COLUMN "branch_slug" SET DEFAULT '';
