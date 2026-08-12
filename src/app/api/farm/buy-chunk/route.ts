import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CHUNK_OFFSETS, MAX_CHUNKS, chunkCost, chunksToJson, emptyChunk, initialChunks, type Chunk } from "@/lib/farm";

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
    create: { kidId, chunks: chunksToJson(initialChunks()) },
    update: {},
  });

  const chunks = progress.chunks as unknown as Chunk[];
  if (chunks.length >= MAX_CHUNKS) {
    return NextResponse.json({ error: "max land" }, { status: 400 });
  }
  const cost = chunkCost(chunks.length);
  if (progress.coins < cost) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const [cx, cy] = CHUNK_OFFSETS[chunks.length];
  const nextChunks = [...chunks, emptyChunk(cx, cy)];

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - cost, chunks: chunksToJson(nextChunks) },
  });

  return NextResponse.json({ progress: updated });
}
