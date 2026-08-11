-- CreateTable
CREATE TABLE "StarHopperProgress" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "unlockedLevel" INTEGER NOT NULL DEFAULT 1,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarHopperProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StarHopperProgress_kidId_difficulty_key" ON "StarHopperProgress"("kidId", "difficulty");

-- AddForeignKey
ALTER TABLE "StarHopperProgress" ADD CONSTRAINT "StarHopperProgress_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
