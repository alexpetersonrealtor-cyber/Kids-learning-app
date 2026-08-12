/*
  Warnings:

  - You are about to drop the column `basket` on the `FarmProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FarmProgress" DROP COLUMN "basket",
ADD COLUMN     "animalPens" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "autoHarvest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoPlant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "barn" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "barnLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "currentOrder" JSONB,
ADD COLUMN     "lastAutoTickAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
