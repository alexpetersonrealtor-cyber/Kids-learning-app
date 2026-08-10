-- CreateTable
CREATE TABLE "CarProgress" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "engineLevel" INTEGER NOT NULL DEFAULT 1,
    "wheelsLevel" INTEGER NOT NULL DEFAULT 1,
    "turboLevel" INTEGER NOT NULL DEFAULT 1,
    "color" TEXT NOT NULL DEFAULT 'red',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackRecord" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CarProgress_kidId_key" ON "CarProgress"("kidId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackRecord_parentId_trackId_key" ON "TrackRecord"("parentId", "trackId");

-- AddForeignKey
ALTER TABLE "CarProgress" ADD CONSTRAINT "CarProgress_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackRecord" ADD CONSTRAINT "TrackRecord_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackRecord" ADD CONSTRAINT "TrackRecord_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
