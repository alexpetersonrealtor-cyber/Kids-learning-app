import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyPlots, landCost, MAX_LAND, plotsToJson, STARTING_LAND, type Plot } from "@/lib/farm";

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

  const progress = await prisma.farmProgress.upsert({
    where: { kidId },
    create: { kidId, plots: plotsToJson(emptyPlots(STARTING_LAND)) },
    update: {},
  });

  if (progress.landLevel >= MAX_LAND) {
    return NextResponse.json({ error: "max land" }, { status: 400 });
  }
  const cost = landCost(progress.landLevel);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const plots = progress.plots as unknown as Plot[];
  plots.push({ crop: null, plantedAt: null });

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, landLevel: progress.landLevel + 1, plots: plotsToJson(plots) },
  });

  return NextResponse.json({ progress: updated });
}
