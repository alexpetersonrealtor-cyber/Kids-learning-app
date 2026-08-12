import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ANIMALS,
  CROPS,
  barnToJson,
  canFulfillOrder,
  generateOrder,
  getPen,
  orderToJson,
  type AnimalPens,
  type Barn,
  type CustomerOrder,
} from "@/lib/farm";

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

  const order = progress.currentOrder as unknown as CustomerOrder | null;
  if (!order) {
    return NextResponse.json({ error: "no active order" }, { status: 400 });
  }
  const barn = progress.barn as unknown as Barn;
  if (!canFulfillOrder(barn, order)) {
    return NextResponse.json({ error: "not enough stock" }, { status: 400 });
  }

  barn[order.itemId] = (barn[order.itemId] ?? 0) - order.quantity;
  if (barn[order.itemId] <= 0) delete barn[order.itemId];

  const pens = progress.animalPens as unknown as AnimalPens;
  const availableItemIds = [
    ...CROPS.map((c) => c.id),
    ...ANIMALS.filter((a) => getPen(pens, a.id).count > 0).map((a) => a.productId),
  ];
  const nextOrder = generateOrder(availableItemIds, Math.random);

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: {
      coins: progress.coins + order.reward,
      barn: barnToJson(barn),
      currentOrder: nextOrder ? orderToJson(nextOrder) : undefined,
    },
  });

  return NextResponse.json({ progress: updated, earned: order.reward });
}
