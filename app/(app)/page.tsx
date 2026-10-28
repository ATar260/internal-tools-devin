import Link from "next/link";
import { can, getCurrentUser } from "@/lib/auth";
import { countAll, countBy, listAudit } from "@/lib/records";
import { APPS } from "@/lib/schema";
import { AuditList } from "@/components/AuditList";

export default async function HomePage() {
  const user = await getCurrentUser();
  const recent = listAudit({ limit: 8 });
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900">Hello, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-gray-600">
        You are signed in as <span className="font-medium">{user.role}</span>. Each tool below is defined
        once in <code className="rounded bg-gray-100 px-1">lib/schema.ts</code>; the screens are generated.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {APPS.map((a) => {
          const total = countAll(a);
          const status = a.workflow ? countBy(a, a.workflow.field) : null;
          return (
            <li key={a.slug} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <Link href={`/apps/${a.slug}`} className="text-base font-semibold text-gray-900 hover:underline">
                {a.name}
              </Link>
              <p className="mt-1 text-sm text-gray-600">{a.description}</p>
              <div className="mt-3 text-2xl font-semibold tabular-nums text-gray-900">{total}</div>
              <div className="text-xs text-gray-500">records</div>
              {status && (
                <ul className="mt-3 space-y-0.5 text-xs text-gray-600">
                  {status.map((s) => (
                    <li key={s.value} className="flex justify-between">
                      <span>{s.value.replace(/_/g, " ")}</span>
                      <span className="tabular-nums">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-1 text-[11px]">
                {(["create", "update", "delete"] as const).map((act) => (
                  <span
                    key={act}
                    className={`rounded px-1.5 py-0.5 ${can(user, a, act) ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400 line-through"}`}
                  >
                    {act}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-gray-500">Recent activity</h2>
      <div className="mt-2">
        <AuditList entries={recent} />
      </div>
    </div>
  );
}
