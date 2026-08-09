"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATARS } from "@/lib/constants";
import type { GradeLevel } from "@prisma/client";

async function requireParentId(): Promise<string> {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");
  return parentId;
}

const GRADE_VALUES = ["PRE_K", "K", "FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH"];

function readGrade(formData: FormData, field: string): GradeLevel {
  const value = String(formData.get(field) ?? "K");
  return (GRADE_VALUES.includes(value) ? value : "K") as GradeLevel;
}

export async function createKid(formData: FormData) {
  const parentId = await requireParentId();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const avatarRaw = String(formData.get("avatar") ?? "fox");
  const avatar = AVATARS.includes(avatarRaw) ? avatarRaw : "fox";
  const pinRaw = String(formData.get("pin") ?? "").trim();
  const pin = /^\d{4}$/.test(pinRaw) ? pinRaw : null;

  await prisma.kid.create({
    data: {
      parentId,
      name,
      avatar,
      pin,
      mathGradeLevel: readGrade(formData, "mathGradeLevel"),
      readingGradeLevel: readGrade(formData, "readingGradeLevel"),
    },
  });

  revalidatePath("/dashboard");
}

export async function updateKid(kidId: string, formData: FormData) {
  const parentId = await requireParentId();

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) redirect("/dashboard");

  const name = String(formData.get("name") ?? "").trim();
  const avatarRaw = String(formData.get("avatar") ?? kid.avatar);
  const avatar = AVATARS.includes(avatarRaw) ? avatarRaw : kid.avatar;
  const pinRaw = String(formData.get("pin") ?? "").trim();
  const pin = pinRaw === "" ? null : /^\d{4}$/.test(pinRaw) ? pinRaw : kid.pin;

  await prisma.kid.update({
    where: { id: kidId },
    data: {
      name: name || kid.name,
      avatar,
      pin,
      mathGradeLevel: readGrade(formData, "mathGradeLevel"),
      readingGradeLevel: readGrade(formData, "readingGradeLevel"),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/kids/${kidId}`);
}

export async function deleteKid(kidId: string) {
  const parentId = await requireParentId();

  const kid = await prisma.kid.findFirst({ where: { id: kidId, parentId } });
  if (!kid) redirect("/dashboard");

  await prisma.kid.delete({ where: { id: kidId } });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
