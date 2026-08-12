#!/usr/bin/env node
// Restores a JSON backup produced by backup-db.mjs into whatever Postgres
// DATABASE_URL points at. Meant for a fresh/empty database (e.g. a brand
// new Supabase project during an account migration) — run
// `npx prisma migrate deploy` against it first so the schema exists, then
// restore. Models are inserted in the same order they're declared in
// schema.prisma, which is already dependency-respecting (Parent before
// Kid, Kid before everything that references a kid), so foreign keys are
// satisfied without any manual ordering.
//
// Usage: DATABASE_URL="postgresql://..." node scripts/restore-db.mjs backups/kids-app-backup-....json

import { PrismaClient, Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";

function modelAccessor(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node scripts/restore-db.mjs <backup-file.json>");
    process.exit(1);
  }

  const dump = JSON.parse(readFileSync(file, "utf8"));
  const prisma = new PrismaClient();
  const modelNames = Prisma.dmmf.datamodel.models.map((m) => m.name);

  for (const name of modelNames) {
    const accessor = modelAccessor(name);
    const rows = dump[accessor];
    if (!rows || rows.length === 0) continue;
    const result = await prisma[accessor].createMany({ data: rows, skipDuplicates: true });
    console.log(`${name}: restored ${result.count} / ${rows.length}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
