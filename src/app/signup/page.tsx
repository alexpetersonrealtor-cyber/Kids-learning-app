import Link from "next/link";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";
import { isSignupAllowed } from "@/lib/signup-policy";
import { AuthError } from "next-auth";

async function signup(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect("/signup?error=invalid");
  }

  if (!(await isSignupAllowed(email))) {
    redirect("/signup?error=closed");
  }

  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    redirect("/signup?error=exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.parent.create({
    data: { email, passwordHash, name: name || null },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login");
    }
    throw err;
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">
          Create your parent account
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Set up the family dashboard for kid profiles, timers, and progress.
        </p>

        {error === "closed" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Signups are closed. Contact the account owner if you need access.
          </p>
        )}
        {error === "exists" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            An account with that email already exists.
          </p>
        )}
        {error === "invalid" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Please enter a valid email and a password with 8+ characters.
          </p>
        )}

        <form action={signup} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name (optional)
            <input
              name="name"
              type="text"
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-sky-600">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
