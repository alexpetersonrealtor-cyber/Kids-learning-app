import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CELLS_PER_CHUNK,
  animalCost,
  chunksToJson,
  countAnimalType,
  getAnimal,
  getCrop,
  plantCell,
  type Chunk,
} from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
  cellIndex: z.number().int().min(0).max(CELLS_PER_CHUNK - 1),
  content: z.enum(["crop", "animal"]),
  itemId: z.string().min(1),
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
  const { kidId, chunkIndex, cellIndex, content, itemId } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.farmProgress.findUnique({ where: { kidId } });
  if (!progress) {
    return NextResponse.json({ error: "no farm yet" }, { status: 400 });
  }

  const chunks = progress.chunks as unknown as Chunk[];
  const chunk = chunks[chunkIndex];
  if (!chunk) {
    return NextResponse.json({ error: "unknown chunk" }, { status: 400 });
  }
  const cell = chunk.cells[cellIndex];
  if (!cell || cell.content !== "empty") {
    return NextResponse.json({ error: "cell not empty" }, { status: 400 });
  }

  let cost: number;
  if (content === "crop") {
    const crop = getCrop(itemId);
    if (!crop) return NextResponse.json({ error: "unknown crop" }, { status: 400 });
    cost = crop.seedCost;
  } else {
    const animal = getAnimal(itemId);
    if (!animal) return NextResponse.json({ error: "unknown animal" }, { status: 400 });
    cost = animalCost(animal, countAnimalType(chunks, itemId));
  }
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const nextChunks = chunks.map((c, ci) =>
    ci !== chunkIndex ? c : { ...c, cells: c.cells.map((cell2, i) => (i === cellIndex ? plantCell(content, itemId) : cell2)) },
  );

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, chunks: chunksToJson(nextChunks) },
  });

  return NextResponse.json({ progress: updated });
}
