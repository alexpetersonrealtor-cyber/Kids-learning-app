import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  kidId: z.string().min(1),
  gameType: z.string().min(1),
  subject: z.string().min(1),
  skillTag: z.string().min(1),
  startedAt: z.string().datetime(),
  score: z.number().int().optional(),
  accuracy: z.number().min(0).max(100).optional(),
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
  const { kidId, gameType, subject, skillTag, startedAt, score, accuracy } = parsed.data;

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const created = await prisma.gameSession.create({
    data: {
      kidId,
      gameType,
      subject,
      skillTag,
      startedAt: new Date(startedAt),
      endedAt: new Date(),
      score,
      accuracy,
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
