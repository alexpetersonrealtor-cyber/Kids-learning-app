import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addManyToBarn,
  addToBasket,
  animalPensToJson,
  barnCapacityForLevel,
  barnToJson,
  basketToJson,
  getAnimal,
  getPen,
  penState,
  type AnimalPens,
  type Barn,
  type Basket,
} from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  animalId: z.string().min(1),
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
  const { kidId, animalId } = parsed.data;

  const animal = getAnimal(animalId);
  if (!animal) {
    return NextResponse.json({ error: "unknown animal" }, { status: 400 });
  }

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  const pens = progress.animalPens as unknown as AnimalPens;
  const pen = getPen(pens, animalId);
  if (penState(pen, animal, Date.now()) !== "ready") {
    return NextResponse.json({ error: "not ready" }, { status: 400 });
  }

  let data: Prisma.FarmProgressUpdateInput;
  if (progress.autoHarvest) {
    const barn = progress.barn as unknown as Barn;
    const capacity = barnCapacityForLevel(progress.barnLevel);
    const added = addManyToBarn(barn, animal.productId, pen.count, capacity);
    if (added < pen.count) {
      return NextResponse.json({ error: "barn full" }, { status: 400 });
    }
    pens[animalId] = { ...pen, lastCollectedAt: new Date().toISOString() };
    data = { barn: barnToJson(barn), animalPens: animalPensToJson(pens) };
  } else {
    const basket = progress.basket as unknown as Basket;
    const added = addToBasket(basket, animal.productId, pen.count);
    if (added < pen.count) {
      return NextResponse.json({ error: "basket full" }, { status: 400 });
    }
    pens[animalId] = { ...pen, lastCollectedAt: new Date().toISOString() };
    data = { basket: basketToJson(basket), animalPens: animalPensToJson(pens) };
  }

  const updated = await prisma.farmProgress.update({ where: { kidId }, data });

  return NextResponse.json({ progress: updated });
}
