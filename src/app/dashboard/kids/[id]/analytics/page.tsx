import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avatarEmoji } from "@/lib/avatars";
import {
  AccuracyTrendChart,
  GamesPlayedChart,
  type AccuracyPoint,
  type GameCountEntry,
} from "@/components/AnalyticsCharts";

export default async function KidAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");

  const kid = await prisma.kid.findFirst({ where: { id, parentId } });
  if (!kid) redirect("/dashboard");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const sessions = await prisma.gameSession.findMany({
    where: { kidId: kid.id, startedAt: { gte: since } },
    orderBy: { startedAt: "asc" },
  });

  const totalGames = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => {
    if (!s.endedAt) return sum;
    return sum + (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
  }, 0);
  const accuracySessions = sessions.filter((s) => s.accuracy != null);
  const avgAccuracy =
    accuracySessions.length > 0
      ? accuracySessions.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) /
        accuracySessions.length
      : null;

  const accuracyByDay = new Map<string, { total: number; count: number }>();
  for (const s of accuracySessions) {
    const day = s.startedAt.toISOString().slice(5, 10);
    const entry = accuracyByDay.get(day) ?? { total: 0, count: 0 };
    entry.total += s.accuracy ?? 0;
    entry.count += 1;
    accuracyByDay.set(day, entry);
  }
  const accuracyTrend: AccuracyPoint[] = Array.from(accuracyByDay.entries()).map(
    ([date, { total, count }]) => ({
      date,
      accuracy: Math.round((total / count) * 10) / 10,
    }),
  );

  const byGame = new Map<string, { count: number; minutes: number }>();
  for (const s of sessions) {
    const entry = byGame.get(s.gameType) ?? { count: 0, minutes: 0 };
    entry.count += 1;
    if (s.endedAt) {
      entry.minutes += (s.endedAt.getTime() - s.startedAt.getTime()) / 60000;
    }
    byGame.set(s.gameType, entry);
  }
  const gamesPlayed: GameCountEntry[] = Array.from(byGame.entries()).map(
    ([gameType, { count, minutes }]) => ({
      gameType,
      count,
      minutes: Math.round(minutes),
    }),
  );

  const bySkill = new Map<string, { total: number; count: number }>();
  for (const s of accuracySessions) {
    const key = `${s.subject} · ${s.skillTag}`;
    const entry = bySkill.get(key) ?? { total: 0, count: 0 };
    entry.total += s.accuracy ?? 0;
    entry.count += 1;
    bySkill.set(key, entry);
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-sky-600">
        ← Back to dashboard
      </Link>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
        <span className="text-3xl">{avatarEmoji(kid.avatar)}</span>
        {kid.name}&rsquo;s progress (last 30 days)
      </h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Games played" value={String(totalGames)} />
        <StatCard label="Time spent" value={`${Math.round(totalMinutes)} min`} />
        <StatCard
          label="Avg. accuracy"
          value={avgAccuracy != null ? `${Math.round(avgAccuracy)}%` : "—"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">
          Accuracy trend (all skills)
        </h2>
        <AccuracyTrendChart data={accuracyTrend} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Games played</h2>
        <GamesPlayedChart data={gamesPlayed} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">By skill</h2>
        {bySkill.size === 0 ? (
          <p className="text-sm text-slate-400">No skill data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Skill</th>
                <th className="py-2">Sessions</th>
                <th className="py-2">Avg. accuracy</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(bySkill.entries()).map(([key, { total, count }]) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="py-2">{key}</td>
                  <td className="py-2">{count}</td>
                  <td className="py-2">{Math.round(total / count)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
