import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DIFFICULTY_LEVELS } from "@/lib/difficulty";

export async function GET(req: NextRequest) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kidId = req.nextUrl.searchParams.get("kidId");
  if (!kidId) {
    return NextResponse.json({ error: "kidId required" }, { status: 400 });
  }
  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const rows = await Promise.all(
    DIFFICULTY_LEVELS.map(({ value }) =>
      prisma.starHopperProgress.upsert({
        where: { kidId_difficulty: { kidId, difficulty: value } },
        create: { kidId, difficulty: value },
        update: {},
      }),
    ),
  );

  return NextResponse.json({ progress: rows });
}
