import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { APPS } from "@/lib/schema";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="px-5 py-4">
          <Link href="/" className="text-base font-semibold text-gray-900">
            Internal Tools
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {APPS.map((a) => (
            <Link
              key={a.slug}
              href={`/apps/${a.slug}`}
              className="block rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
            >
              {a.name}
            </Link>
          ))}
          <div className="pt-3">
            <Link href="/audit" className="block rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              Audit log
            </Link>
          </div>
        </nav>
        <div className="border-t border-gray-200 px-5 py-4 text-sm">
          <div className="font-medium text-gray-900">{user.name}</div>
          <div className="text-gray-500">
            {user.role} · {user.team}
          </div>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-xs text-blue-700 hover:underline">
              Switch user
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <Link href="/" className="font-semibold">Internal Tools</Link>
          <form action={logout}>
            <button className="text-xs text-blue-700">{user.name} · switch</button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
