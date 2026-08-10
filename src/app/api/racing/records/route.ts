import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const trackId = req.nextUrl.searchParams.get("trackId");

  const records = await prisma.trackRecord.findMany({
    where: { parentId, ...(trackId ? { trackId } : {}) },
    include: { kid: { select: { name: true, avatar: true } } },
  });

  return NextResponse.json({
    records: records.map((r) => ({
      trackId: r.trackId,
      timeMs: r.timeMs,
      kidId: r.kidId,
      kidName: r.kid.name,
      kidAvatar: r.kid.avatar,
    })),
  });
}
