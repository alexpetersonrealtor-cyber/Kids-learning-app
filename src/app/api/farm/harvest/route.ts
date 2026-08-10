import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectiveGrowTimeMs, effectiveSellPrice, getCrop, plotsToJson, type Plot } from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  plotIndex: z.number().int().min(0),
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
  const { kidId, plotIndex } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  const plots = progress.plots as unknown as Plot[];
  const plot = plots[plotIndex];
  if (!plot?.crop || !plot.plantedAt) {
    return NextResponse.json({ error: "nothing planted" }, { status: 400 });
  }
  const crop = getCrop(plot.crop);
  if (!crop) {
    return NextResponse.json({ error: "unknown crop" }, { status: 400 });
  }
  const readyAt = new Date(plot.plantedAt).getTime() + effectiveGrowTimeMs(crop, progress.wateringLevel);
  if (Date.now() < readyAt) {
    return NextResponse.json({ error: "not ready" }, { status: 400 });
  }

  const earned = effectiveSellPrice(crop, progress.fertilizerLevel);
  plots[plotIndex] = { crop: null, plantedAt: null };
  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins + earned, plots: plotsToJson(plots) },
  });

  return NextResponse.json({ progress: updated, earned });
}
