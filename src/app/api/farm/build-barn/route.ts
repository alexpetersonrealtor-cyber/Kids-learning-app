import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BARN_BUILD_COST, buildBarn, canBuildBarn, chunksToJson, type Chunk } from "@/lib/farm";

const bodySchema = z.object({
  kidId: z.string().min(1),
  chunkIndex: z.number().int().min(0),
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
  const { kidId, chunkIndex } = parsed.data;

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
  if (!canBuildBarn(chunk)) {
    return NextResponse.json({ error: "not enough empty cells" }, { status: 400 });
  }
  if (progress.coins < BARN_BUILD_COST) {
    return NextResponse.json({ error: "not enough coins" }, { status: 400 });
  }

  const nextChunks = chunks.map((c, ci) => (ci === chunkIndex ? buildBarn(c) : c));

  const updated = await prisma.farmProgress.update({
    where: { kidId },
    data: { coins: progress.coins - BARN_BUILD_COST, chunks: chunksToJson(nextChunks) },
  });

  return NextResponse.json({ progress: updated });
}
