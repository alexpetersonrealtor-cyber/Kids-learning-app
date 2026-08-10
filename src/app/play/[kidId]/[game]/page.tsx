import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGame } from "@/lib/games-catalog";
import { tierForGrade } from "@/lib/grade-tiers";
import TimerGate from "@/components/TimerGate";
import GameShell from "@/components/GameShell";

export default async function GamePage({
  params,
}: {
  params: Promise<{ kidId: string; game: string }>;
}) {
  const { kidId, game } = await params;
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) redirect("/play");

  const entry = getGame(game);
  if (!entry) notFound();

  return (
    <TimerGate kidId={kid.id}>
      <GameShell
        kidId={kid.id}
        slug={entry.slug}
        gameName={entry.name}
        mathTier={tierForGrade(kid.mathGradeLevel)}
        mathGrade={kid.mathGradeLevel}
        readingGrade={kid.readingGradeLevel}
      />
    </TimerGate>
  );
}
