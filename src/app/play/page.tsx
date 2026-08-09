import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfilePicker from "@/components/ProfilePicker";

export default async function PlaySelectPage() {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");

  const kids = await prisma.kid.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, avatar: true, pin: true },
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 bg-gradient-to-b from-sky-100 to-emerald-50 px-6 py-12">
      <h1 className="text-3xl font-extrabold text-slate-800">
        Who&rsquo;s playing? 🎮
      </h1>

      {kids.length === 0 ? (
        <p className="text-slate-500">
          No kid profiles yet — add one from the parent dashboard.
        </p>
      ) : (
        <ProfilePicker
          kids={kids.map((k) => ({
            id: k.id,
            name: k.name,
            avatar: k.avatar,
            hasPin: !!k.pin,
          }))}
        />
      )}
    </main>
  );
}
