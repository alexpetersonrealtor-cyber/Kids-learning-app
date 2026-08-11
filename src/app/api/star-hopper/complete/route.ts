import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LEVELS_PER_DIFFICULTY } from "@/lib/star-hopper-levels";

const bodySchema = z.object({
  kidId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
  level: z.number().int().min(1).max(LEVELS_PER_DIFFICULTY),
  score: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { kidId, difficulty, level, score } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const current = await prisma.starHopperProgress.upsert({
    where: { kidId_difficulty: { kidId, difficulty } },
    create: { kidId, difficulty },
    update: {},
  });

  const unlockedLevel = Math.max(current.unlockedLevel, Math.min(level + 1, LEVELS_PER_DIFFICULTY + 1));
  const bestScore = Math.max(current.bestScore, score);

  const updated = await prisma.starHopperProgress.update({
    where: { id: current.id },
    data: { unlockedLevel, bestScore },
  });

  return NextResponse.json({ progress: updated });
}
