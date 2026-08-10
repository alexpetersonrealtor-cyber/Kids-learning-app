-- CreateTable
CREATE TABLE "FarmProgress" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 50,
    "landLevel" INTEGER NOT NULL DEFAULT 4,
    "wateringLevel" INTEGER NOT NULL DEFAULT 1,
    "fertilizerLevel" INTEGER NOT NULL DEFAULT 1,
    "plots" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FarmProgress_kidId_key" ON "FarmProgress"("kidId");

-- AddForeignKey
ALTER TABLE "FarmProgress" ADD CONSTRAINT "FarmProgress_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
