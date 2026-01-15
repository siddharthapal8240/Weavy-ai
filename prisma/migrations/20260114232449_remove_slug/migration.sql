/*
  Warnings:

  - You are about to drop the column `slug` on the `workflows` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "workflows_user_id_slug_key";

-- AlterTable
ALTER TABLE "workflows" DROP COLUMN "slug";
