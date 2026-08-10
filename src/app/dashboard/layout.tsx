import Link from "next/link";
import { signOut } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <Link href="/dashboard" className="text-lg font-bold text-slate-800">
          🏠 Family Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/play" className="text-sm font-medium text-sky-600">
            Kid Play Screen →
          </Link>
          <Link
            href="/dashboard/account"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Account
          </Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
