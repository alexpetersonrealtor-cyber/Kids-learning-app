import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAR_STATS, MAX_CAR_LEVEL, upgradeCost, type CarStat } from "@/lib/racing";

const LEVEL_FIELD: Record<CarStat, "engineLevel" | "wheelsLevel" | "turboLevel"> = {
  engine: "engineLevel",
  wheels: "wheelsLevel",
  turbo: "turboLevel",
};

const bodySchema = z.object({
  kidId: z.string().min(1),
  stat: z.enum(CAR_STATS as [CarStat, ...CarStat[]]),
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
  const { kidId, stat } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.carProgress.upsert({
    where: { kidId },
    create: { kidId },
    update: {},
  });

  const field = LEVEL_FIELD[stat];
  const currentLevel = progress[field];
  if (currentLevel >= MAX_CAR_LEVEL) {
    return NextResponse.json({ error: "max level" }, { status: 400 });
  }
  const cost = upgradeCost(currentLevel);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const updated = await prisma.carProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, [field]: currentLevel + 1 },
  });

  return NextResponse.json({ progress: updated });
}
