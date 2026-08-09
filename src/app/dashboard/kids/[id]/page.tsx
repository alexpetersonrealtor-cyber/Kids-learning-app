import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateKid, deleteKid } from "@/lib/actions/kids";
import { AVATARS } from "@/lib/constants";
import { GRADE_LEVELS } from "@/lib/grade-tiers";
import { avatarEmoji } from "@/lib/avatars";

export default async function EditKidPage({
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

  const updateKidWithId = updateKid.bind(null, kid.id);
  const deleteKidWithId = deleteKid.bind(null, kid.id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm text-sky-600">
        ← Back to dashboard
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
          <span className="text-3xl">{avatarEmoji(kid.avatar)}</span>
          Edit {kid.name}
        </h1>

        <form action={updateKidWithId} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name
            <input
              name="name"
              defaultValue={kid.name}
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Avatar
            <select
              name="avatar"
              defaultValue={kid.avatar}
              className="rounded-lg border border-slate-300 px-3 py-2"
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
              defaultValue={kid.mathGradeLevel}
              className="rounded-lg border border-slate-300 px-3 py-2"
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
              defaultValue={kid.readingGradeLevel}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            PIN (4 digits, leave blank for none)
            <input
              name="pin"
              maxLength={4}
              pattern="\d{4}"
              defaultValue={kid.pin ?? ""}
              placeholder="e.g. 1234"
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="col-span-full flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
            >
              Save changes
            </button>
          </div>
        </form>

        <form
          action={deleteKidWithId}
          className="mt-8 border-t border-slate-200 pt-4"
        >
          <p className="mb-2 text-sm text-slate-500">
            Removing a profile deletes their game history and timers too.
          </p>
          <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
            Delete {kid.name}&rsquo;s profile
          </button>
        </form>
      </div>
    </div>
  );
}
