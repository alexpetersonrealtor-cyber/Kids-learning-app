"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireParentId(): Promise<string> {
  const session = await auth();
  const parentId = session?.user?.id;
  if (!parentId) redirect("/login");
  return parentId;
}

export async function changePassword(formData: FormData) {
  const parentId = await requireParentId();

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/dashboard/account?error=too-short");
  }
  if (newPassword !== confirmPassword) {
    redirect("/dashboard/account?error=mismatch");
  }

  const parent = await prisma.parent.findUnique({ where: { id: parentId } });
  if (!parent) redirect("/login");

  const valid = await bcrypt.compare(currentPassword, parent.passwordHash);
  if (!valid) {
    redirect("/dashboard/account?error=wrong-current");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.parent.update({
    where: { id: parentId },
    data: { passwordHash },
  });

  redirect("/dashboard/account?success=1");
}
