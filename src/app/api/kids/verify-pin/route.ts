import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  kidId: z.string().min(1),
  pin: z.string().length(4),
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

  const kid = await prisma.kid.findFirst({
    where: { id: parsed.data.kidId, parentId },
  });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ok = kid.pin != null && kid.pin === parsed.data.pin;
  return NextResponse.json({ ok });
}
