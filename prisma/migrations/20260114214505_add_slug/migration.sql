/*
  Warnings:

  - A unique constraint covering the columns `[user_id,slug]` on the table `workflows` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `workflows` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workflows_user_id_slug_key" ON "workflows"("user_id", "slug");
