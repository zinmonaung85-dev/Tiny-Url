/*
  Warnings:

  - A unique constraint covering the columns `[shortCode,userId]` on the table `Url` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Url_shortCode_key";

-- DropIndex
DROP INDEX "Url_userId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Url_shortCode_userId_key" ON "Url"("shortCode", "userId");
