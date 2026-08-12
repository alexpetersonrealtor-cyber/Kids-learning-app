import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { barnToJson, basketToJson, depositBasket, totalBarnCapacity, type Barn, type Basket, type Chunk } from "@/lib/farm";

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

  const capacity = totalBarnCapacity(progress.chunks as unknown as Chunk[]);
  const { basket, barn } = depositBasket(
    progress.basket as unknown as Basket,
    progress.barn as unknown as Barn,
    capacity,
  );

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { basket: basketToJson(basket), barn: barnToJson(barn) },
  });

  return NextResponse.json({ progress: updated });
}
