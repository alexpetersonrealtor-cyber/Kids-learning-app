import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CAR_COLORS } from "@/lib/racing";

async function requireKid(parentId: string, kidId: string) {
  return prisma.kid.findFirst({ where: { id: kidId, parentId } });
}

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
  const kid = await requireKid(parentId, kidId);
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.carProgress.upsert({
    where: { kidId },
    create: { kidId },
    update: {},
  });

  return NextResponse.json({ progress });
}

const bodySchema = z.object({
  kidId: z.string().min(1),
  color: z.enum(CAR_COLORS),
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
  const kid = await requireKid(parentId, parsed.data.kidId);
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const progress = await prisma.carProgress.upsert({
    where: { kidId: parsed.data.kidId },
    create: { kidId: parsed.data.kidId, color: parsed.data.color },
    update: { color: parsed.data.color },
  });

  return NextResponse.json({ progress });
}
