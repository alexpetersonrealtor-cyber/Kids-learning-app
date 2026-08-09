#!/usr/bin/env node
// Logical backup: dumps every row via Prisma (not `pg_dump`) so it runs
// anywhere Node + DATABASE_URL are available, with no Postgres client
// tools required. Writes a single timestamped JSON file to ./backups/.
//
// Usage: DATABASE_URL="postgresql://..." node scripts/backup-db.mjs

import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

async function main() {
  const prisma = new PrismaClient();

  const [parents, kids, gameSessions, timerSessions] = await Promise.all([
    prisma.parent.findMany(),
    prisma.kid.findMany(),
    prisma.gameSession.findMany(),
    prisma.timerSession.findMany(),
  ]);

  await prisma.$disconnect();

  const dump = {
    takenAt: new Date().toISOString(),
    parents,
    kids,
    gameSessions,
    timerSessions,
  };

  const dir = path.join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const filename = `kids-app-backup-${dump.takenAt.replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, JSON.stringify(dump, null, 2));

  console.log(filePath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
