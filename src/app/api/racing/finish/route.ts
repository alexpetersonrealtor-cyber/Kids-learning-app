import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTrack, PLACEMENT_REWARDS } from "@/lib/racing";

const bodySchema = z.object({
  kidId: z.string().min(1),
  trackId: z.string().min(1),
  timeMs: z.number().int().positive().max(10 * 60 * 1000),
  placement: z.number().int().min(1).max(4),
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
  const { kidId, trackId, timeMs, placement } = parsed.data;

  if (!getTrack(trackId)) {
    return NextResponse.json({ error: "unknown track" }, { status: 400 });
  }
  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const reward = PLACEMENT_REWARDS[placement - 1] ?? 0;

  const progress = await prisma.carProgress.upsert({
    where: { kidId },
    create: { kidId, coins: reward },
    update: { coins: { increment: reward } },
  });

  const existingRecord = await prisma.trackRecord.findUnique({
    where: { parentId_trackId: { parentId, trackId } },
  });

  let isNewRecord = false;
  let record = existingRecord;
  if (!existingRecord || timeMs < existingRecord.timeMs) {
    isNewRecord = true;
    record = await prisma.trackRecord.upsert({
      where: { parentId_trackId: { parentId, trackId } },
      create: { parentId, trackId, kidId, timeMs },
      update: { kidId, timeMs },
    });
  }

  return NextResponse.json({
    reward,
    totalCoins: progress.coins,
    isNewRecord,
    record: record ? { timeMs: record.timeMs, kidId: record.kidId } : null,
  });
}
