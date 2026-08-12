#!/usr/bin/env node
// Logical backup: dumps every row of every model via Prisma (not `pg_dump`)
// so it runs anywhere Node + DATABASE_URL are available, with no Postgres
// client tools required. Writes a single timestamped JSON file to
// ./backups/. Models are discovered from the schema at runtime (via
// Prisma's dmmf) instead of hand-listed, so a newly added model is never
// silently left out of the backup the way CarProgress/TrackRecord/
// FarmProgress/StarHopperProgress previously were.
//
// Usage: DATABASE_URL="postgresql://..." node scripts/backup-db.mjs

import { PrismaClient, Prisma } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

function modelAccessor(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function main() {
  const prisma = new PrismaClient();
  const modelNames = Prisma.dmmf.datamodel.models.map((m) => m.name);

  const dump = { takenAt: new Date().toISOString(), models: modelNames };
  for (const name of modelNames) {
    dump[modelAccessor(name)] = await prisma[modelAccessor(name)].findMany();
  }

  await prisma.$disconnect();

  const dir = path.join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const filename = `kids-app-backup-${dump.takenAt.replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(dir, filename);
  writeFileSync(filePath, JSON.stringify(dump, null, 2));

  console.log(filePath);
  console.log(modelNames.map((n) => `${n}: ${dump[modelAccessor(n)].length}`).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
