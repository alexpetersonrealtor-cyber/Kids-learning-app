import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chunksToJson, initialChunks, MAX_UPGRADE_LEVEL, upgradeCost } from "@/lib/farm";

const STATS = ["watering", "fertilizer"] as const;
type Stat = (typeof STATS)[number];

const LEVEL_FIELD: Record<Stat, "wateringLevel" | "fertilizerLevel"> = {
  watering: "wateringLevel",
  fertilizer: "fertilizerLevel",
};

const bodySchema = z.object({
  kidId: z.string().min(1),
  stat: z.enum(STATS as unknown as [Stat, ...Stat[]]),
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

  const progress = await prisma.farmProgress.upsert({
    where: { kidId },
    create: { kidId, chunks: chunksToJson(initialChunks()) },
    update: {},
  });

  const field = LEVEL_FIELD[stat];
  const currentLevel = progress[field];
  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return NextResponse.json({ error: "max level" }, { status: 400 });
  }
  const cost = upgradeCost(currentLevel);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, [field]: currentLevel + 1 },
  });

  return NextResponse.json({ progress: updated });
}
