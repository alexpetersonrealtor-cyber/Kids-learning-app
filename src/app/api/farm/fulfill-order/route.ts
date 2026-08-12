import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ANIMALS,
  CROPS,
  barnToJson,
  canFulfillOrder,
  countAnimalType,
  fillOrders,
  ordersToJson,
  type Barn,
  type Chunk,
  type CustomerOrder,
} from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  orderIndex: z.number().int().min(0),
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
  const { kidId, orderIndex } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  const orders = progress.currentOrders as unknown as CustomerOrder[];
  const order = orders[orderIndex];
  if (!order) {
    return NextResponse.json({ error: "no active order" }, { status: 400 });
  }
  const barn = progress.barn as unknown as Barn;
  if (!canFulfillOrder(barn, order)) {
    return NextResponse.json({ error: "not enough stock" }, { status: 400 });
  }

  barn[order.itemId] = (barn[order.itemId] ?? 0) - order.quantity;
  if (barn[order.itemId] <= 0) delete barn[order.itemId];

  const chunks = progress.chunks as unknown as Chunk[];
  const availableItemIds = [
    ...CROPS.map((c) => c.id),
    ...ANIMALS.filter((a) => countAnimalType(chunks, a.id) > 0).map((a) => a.productId),
  ];
  const remainingOrders = orders.filter((_, i) => i !== orderIndex);
  const nextOrders = fillOrders(remainingOrders, availableItemIds, Math.random);

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: {
      coins: progress.coins + order.reward,
      barn: barnToJson(barn),
      currentOrders: ordersToJson(nextOrders),
    },
  });

  return NextResponse.json({ progress: updated, earned: order.reward });
}
