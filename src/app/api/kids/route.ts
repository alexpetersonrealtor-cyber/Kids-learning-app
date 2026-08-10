import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const exclude = req.nextUrl.searchParams.get("exclude");

  const kids = await prisma.kid.findMany({
    where: { parentId, ...(exclude ? { id: { not: exclude } } : {}) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, avatar: true, pin: true },
  });

  return NextResponse.json({
    kids: kids.map((k) => ({
      id: k.id,
      name: k.name,
      avatar: k.avatar,
      hasPin: !!k.pin,
    })),
  });
}
