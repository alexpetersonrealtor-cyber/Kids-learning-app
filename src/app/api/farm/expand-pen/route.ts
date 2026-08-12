import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { animalPensToJson, getAnimal, getPen, MAX_PEN_CAPACITY, penExpandCost, type AnimalPens } from "@/lib/farm";

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
  if (pen.capacity >= MAX_PEN_CAPACITY) {
    return NextResponse.json({ error: "max capacity" }, { status: 400 });
  }
  const cost = penExpandCost(animal, pen.capacity);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  pens[animalId] = { ...pen, capacity: pen.capacity + 1 };
  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, animalPens: animalPensToJson(pens) },
  });

  return NextResponse.json({ progress: updated });
}
