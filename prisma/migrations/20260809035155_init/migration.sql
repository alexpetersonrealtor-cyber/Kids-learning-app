-- CreateEnum
CREATE TYPE "GradeLevel" AS ENUM ('PRE_K', 'K', 'FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH');

-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('ACTIVE', 'ENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kid" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT 'fox',
    "pin" TEXT,
    "mathGradeLevel" "GradeLevel" NOT NULL DEFAULT 'K',
    "readingGradeLevel" "GradeLevel" NOT NULL DEFAULT 'K',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "skillTag" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "score" INTEGER,
    "accuracy" DOUBLE PRECISION,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimerSession" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMinutes" INTEGER NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" "TimerStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "TimerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE INDEX "GameSession_kidId_gameType_idx" ON "GameSession"("kidId", "gameType");

-- CreateIndex
CREATE INDEX "GameSession_kidId_subject_skillTag_idx" ON "GameSession"("kidId", "subject", "skillTag");

-- CreateIndex
CREATE INDEX "TimerSession_kidId_status_idx" ON "TimerSession"("kidId", "status");

-- AddForeignKey
ALTER TABLE "Kid" ADD CONSTRAINT "Kid_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimerSession" ADD CONSTRAINT "TimerSession_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "Kid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
