import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { basketToJson, effectiveSellPrice, getCrop } from "@/lib/farm";

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

  const basket = progress.basket as unknown as string[];
  if (basket.length === 0) {
    return NextResponse.json({ error: "basket empty" }, { status: 400 });
  }

  let earned = 0;
  for (const cropId of basket) {
    const crop = getCrop(cropId);
    if (crop) earned += effectiveSellPrice(crop, progress.fertilizerLevel);
  }

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins + earned, basket: basketToJson([]) },
  });

  return NextResponse.json({ progress: updated, earned });
}
