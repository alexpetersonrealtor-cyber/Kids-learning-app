import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUTO_HARVEST_COST, AUTO_PLANT_COST } from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  type: z.enum(["harvest", "plant"]),
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
  const { kidId, type } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  if (type === "harvest") {
    if (progress.autoHarvest) {
      return NextResponse.json({ error: "already owned" }, { status: 400 });
    }
    if (progress.coins < AUTO_HARVEST_COST) {
      return NextResponse.json({ error: "not enough coins" }, { status: 400 });
    }
    const updated = await prisma.farmProgress.update({
      where: { kidId },
      data: { coins: progress.coins - AUTO_HARVEST_COST, autoHarvest: true },
    });
    return NextResponse.json({ progress: updated });
  }

  if (progress.autoPlant) {
    return NextResponse.json({ error: "already owned" }, { status: 400 });
  }
  if (!progress.autoHarvest) {
    return NextResponse.json({ error: "requires auto-harvest first" }, { status: 400 });
  }
  if (progress.coins < AUTO_PLANT_COST) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }
  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - AUTO_PLANT_COST, autoPlant: true },
  });
  return NextResponse.json({ progress: updated });
}
