import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createKid } from "@/lib/actions/kids";
import { AVATARS } from "@/lib/constants";
import { startTimer, stopTimer } from "@/lib/actions/timer";
import { avatarEmoji } from "@/lib/avatars";
import { GRADE_LEVELS, gradeLabel } from "@/lib/grade-tiers";

function currentTimeMs(): number {
  return Date.now();
}

export default async function DashboardPage() {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");

  const kids = await prisma.kid.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
    include: {
      timerSessions: {
        where: { status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
        take: 1,
      },
    },
  });

  const now = currentTimeMs();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Your kids</h1>
        <p className="text-sm text-slate-500">
          Manage profiles, grade levels, and screen-time timers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kids.map((kid) => {
          const timer = kid.timerSessions[0];
          const endsAt = timer
            ? new Date(timer.startedAt.getTime() + timer.durationMinutes * 60_000)
            : null;
          const active = !!timer && endsAt !== null && endsAt.getTime() > now;

          return (
            <div
              key={kid.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{avatarEmoji(kid.avatar)}</span>
                <div>
                  <p className="font-semibold text-slate-800">{kid.name}</p>
                  <p className="text-xs text-slate-500">
                    Math: {gradeLabel(kid.mathGradeLevel)} · Reading:{" "}
                    {gradeLabel(kid.readingGradeLevel)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                {active ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-600">
                      ⏱ Timer running ({timer.durationMinutes} min)
                    </span>
                    <form action={stopTimer.bind(null, kid.id)}>
                      <button className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200">
                        Stop
                      </button>
                    </form>
                  </div>
                ) : (
                  <form
                    action={startTimer.bind(null, kid.id)}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="number"
                      name="minutes"
                      defaultValue={30}
                      min={1}
                      max={240}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-slate-500">min</span>
                    <button className="ml-auto rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700">
                      Start timer
                    </button>
                  </form>
                )}
              </div>

              <div className="flex gap-2 text-sm">
                <Link
                  href={`/dashboard/kids/${kid.id}`}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-center font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </Link>
                <Link
                  href={`/dashboard/kids/${kid.id}/analytics`}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-center font-medium text-slate-700 hover:bg-slate-50"
                >
                  Progress
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
        <h2 className="mb-4 font-semibold text-slate-800">Add a kid profile</h2>
        <form action={createKid} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              name="name"
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Avatar
            <select
              name="avatar"
              className="rounded-lg border border-slate-300 px-3 py-2"
              defaultValue="fox"
            >
              {AVATARS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Math grade level
            <select
              name="mathGradeLevel"
              className="rounded-lg border border-slate-300 px-3 py-2"
              defaultValue="K"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Reading grade level
            <select
              name="readingGradeLevel"
              className="rounded-lg border border-slate-300 px-3 py-2"
              defaultValue="K"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            PIN (optional, 4 digits)
            <input
              name="pin"
              maxLength={4}
              pattern="\d{4}"
              placeholder="e.g. 1234"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
            >
              Add kid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
