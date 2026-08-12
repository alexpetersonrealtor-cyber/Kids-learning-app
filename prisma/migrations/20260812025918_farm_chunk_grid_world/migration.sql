/*
  Warnings:

  - You are about to drop the column `animalPens` on the `FarmProgress` table. All the data in the column will be lost.
  - You are about to drop the column `barnLevel` on the `FarmProgress` table. All the data in the column will be lost.
  - You are about to drop the column `currentOrder` on the `FarmProgress` table. All the data in the column will be lost.
  - You are about to drop the column `landLevel` on the `FarmProgress` table. All the data in the column will be lost.
  - You are about to drop the column `plots` on the `FarmProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FarmProgress" DROP COLUMN "animalPens",
DROP COLUMN "barnLevel",
DROP COLUMN "currentOrder",
DROP COLUMN "landLevel",
DROP COLUMN "plots",
ADD COLUMN     "chunks" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "currentOrders" JSONB NOT NULL DEFAULT '[]';
