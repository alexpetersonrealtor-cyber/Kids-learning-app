import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ANIMALS,
  CROPS,
  barnToJson,
  chunksToJson,
  countAnimalType,
  fillOrders,
  initialChunks,
  ordersToJson,
  simulateAutoCycles,
  type Barn,
  type Chunk,
  type CustomerOrder,
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
    create: { kidId, chunks: chunksToJson(initialChunks()) },
    update: {},
  });

  const now = new Date();
  const simulated = simulateAutoCycles(
    {
      coins: progress.coins,
      wateringLevel: progress.wateringLevel,
      autoHarvest: progress.autoHarvest,
      autoPlant: progress.autoPlant,
      chunks: progress.chunks as unknown as Chunk[],
      barn: progress.barn as unknown as Barn,
    },
    now.getTime(),
  );

  const availableItemIds = [
    ...CROPS.map((c) => c.id),
    ...ANIMALS.filter((a) => countAnimalType(simulated.chunks, a.id) > 0).map((a) => a.productId),
  ];
  const orders = fillOrders(progress.currentOrders as unknown as CustomerOrder[], availableItemIds, Math.random);

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: {
      coins: simulated.coins,
      chunks: chunksToJson(simulated.chunks),
      barn: barnToJson(simulated.barn),
      currentOrders: ordersToJson(orders),
      lastAutoTickAt: now,
    },
  });

  return NextResponse.json({ progress: updated });
}
