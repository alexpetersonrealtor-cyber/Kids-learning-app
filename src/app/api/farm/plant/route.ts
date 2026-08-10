import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyPlots, getCrop, plotsToJson, STARTING_LAND, type Plot } from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  plotIndex: z.number().int().min(0),
  cropId: z.string().min(1),
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
  const { kidId, plotIndex, cropId } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const crop = getCrop(cropId);
  if (!crop) {
    return NextResponse.json({ error: "unknown crop" }, { status: 400 });
  }

  const progress = await prisma.farmProgress.upsert({
    where: { kidId },
    create: { kidId, plots: plotsToJson(emptyPlots(STARTING_LAND)) },
    update: {},
  });

  if (plotIndex >= progress.landLevel) {
    return NextResponse.json({ error: "plot not owned" }, { status: 400 });
  }
  const plots = progress.plots as unknown as Plot[];
  const plot = plots[plotIndex];
  if (!plot || plot.crop) {
    return NextResponse.json({ error: "plot not empty" }, { status: 400 });
  }
  if (progress.coins < crop.seedCost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  plots[plotIndex] = { crop: crop.id, plantedAt: new Date().toISOString() };
  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - crop.seedCost, plots: plotsToJson(plots) },
  });

  return NextResponse.json({ progress: updated });
}
