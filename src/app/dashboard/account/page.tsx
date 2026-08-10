import { changePassword } from "@/lib/actions/account";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-slate-800">Account</h1>
      <p className="mb-6 text-sm text-slate-500">
        Update the password you use to log in to the parent dashboard.
      </p>

      <div className="rounded-2xl bg-white p-8 shadow-lg">
        {success === "1" && (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600">
            Password updated successfully.
          </p>
        )}
        {error === "too-short" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            New password must be at least 8 characters.
          </p>
        )}
        {error === "mismatch" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            New password and confirmation don&rsquo;t match.
          </p>
        )}
        {error === "wrong-current" && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            Current password is incorrect.
          </p>
        )}

        <form action={changePassword} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Current password
            <input
              name="currentPassword"
              type="password"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            New password
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              className="rounded-lg border border-slate-300 px-3 py-2 text-base"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700"
          >
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
