import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emptyPlots, plotsToJson, STARTING_LAND } from "@/lib/farm";

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

  const progress = await prisma.farmProgress.upsert({
    where: { kidId },
    create: { kidId, plots: plotsToJson(emptyPlots(STARTING_LAND)) },
    update: {},
  });

  return NextResponse.json({ progress });
}
