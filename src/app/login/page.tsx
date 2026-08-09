import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

async function login(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect("/login?error=invalid");
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-slate-800">
          Welcome back
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Log in to your parent dashboard.
        </p>

        {error === "invalid" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Incorrect email or password.
          </p>
        )}

        <form action={login} className="flex flex-col gap-4">
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
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Log in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-sky-600">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
