import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ANIMALS,
  CROPS,
  animalPensToJson,
  barnToJson,
  emptyPlots,
  generateOrder,
  getPen,
  orderToJson,
  plotsToJson,
  simulateAutoCycles,
  STARTING_LAND,
  type AnimalPens,
  type Barn,
  type CustomerOrder,
  type Plot,
} from "@/lib/farm";

export async function GET(req: NextRequest) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const kidId = req.nextUrl.searchParams.get("kidId");
  if (!kidId) {
    return NextResponse.json({ error: "kidId required" }, { status: 400 });
  }
  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.upsert({
    where: { kidId },
    create: { kidId, plots: plotsToJson(emptyPlots(STARTING_LAND)) },
    update: {},
  });

  const now = new Date();
  const simulated = simulateAutoCycles(
    {
      coins: progress.coins,
      wateringLevel: progress.wateringLevel,
      barnLevel: progress.barnLevel,
      autoHarvest: progress.autoHarvest,
      autoPlant: progress.autoPlant,
      plots: progress.plots as unknown as Plot[],
      animalPens: progress.animalPens as unknown as AnimalPens,
      barn: progress.barn as unknown as Barn,
    },
    now.getTime(),
  );

  const pens = simulated.animalPens;
  const availableItemIds = [
    ...CROPS.map((c) => c.id),
    ...ANIMALS.filter((a) => getPen(pens, a.id).count > 0).map((a) => a.productId),
  ];
  const currentOrder = (progress.currentOrder as unknown as CustomerOrder | null) ?? generateOrder(availableItemIds, Math.random);

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: {
      coins: simulated.coins,
      plots: plotsToJson(simulated.plots),
      animalPens: animalPensToJson(simulated.animalPens),
      barn: barnToJson(simulated.barn),
      currentOrder: currentOrder ? orderToJson(currentOrder) : undefined,
      lastAutoTickAt: now,
    },
  });

  return NextResponse.json({ progress: updated });
}
