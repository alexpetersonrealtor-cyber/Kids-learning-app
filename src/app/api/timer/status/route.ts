import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const timer = await prisma.timerSession.findFirst({
    where: { kidId },
    orderBy: { startedAt: "desc" },
  });

  if (!timer) {
    return NextResponse.json({ state: "none" });
  }

  if (timer.status === "ACTIVE") {
    const endsAt = new Date(timer.startedAt.getTime() + timer.durationMinutes * 60_000);
    const remainingSeconds = Math.max(0, Math.round((endsAt.getTime() - Date.now()) / 1000));

    if (remainingSeconds === 0) {
      await prisma.timerSession.update({
        where: { id: timer.id },
        data: { status: "EXPIRED", endedAt: new Date() },
      });
      return NextResponse.json({ state: "locked" });
    }

    return NextResponse.json({
      state: "active",
      endsAt: endsAt.toISOString(),
      remainingSeconds,
    });
  }

  return NextResponse.json({ state: "locked" });
}
