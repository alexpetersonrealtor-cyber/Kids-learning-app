"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireOwnedKid(kidId: string) {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) redirect("/dashboard");
  return kid;
}

export async function startTimer(kidId: string, formData: FormData) {
  await requireOwnedKid(kidId);

  const minutes = Number(formData.get("minutes"));
  const durationMinutes = Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 240) : 30;

  await prisma.timerSession.updateMany({
    where: { kidId, status: "ACTIVE" },
    data: { status: "ENDED", endedAt: new Date() },
  });

  await prisma.timerSession.create({
    data: { kidId, durationMinutes, status: "ACTIVE" },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/kids/${kidId}`);
}

export async function stopTimer(kidId: string) {
  await requireOwnedKid(kidId);

  await prisma.timerSession.updateMany({
    where: { kidId, status: "ACTIVE" },
    data: { status: "ENDED", endedAt: new Date() },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/kids/${kidId}`);
}
