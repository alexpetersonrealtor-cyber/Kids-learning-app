import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { barnUpgradeCost, MAX_BARN_LEVEL } from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
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
  const { kidId } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  if (progress.barnLevel >= MAX_BARN_LEVEL) {
    return NextResponse.json({ error: "max level" }, { status: 400 });
  }
  const cost = barnUpgradeCost(progress.barnLevel);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, barnLevel: progress.barnLevel + 1 },
  });

  return NextResponse.json({ progress: updated });
}
