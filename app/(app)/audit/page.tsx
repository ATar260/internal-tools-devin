import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listAudit } from "@/lib/records";
import { APPS } from "@/lib/schema";
import { AuditList } from "@/components/AuditList";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ app?: string }>;
}) {
  await getCurrentUser();
  const { app } = await searchParams;
  const entries = listAudit({ app: app || undefined, limit: 200 });
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-semibold text-gray-900">Audit log</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every create, edit, delete and workflow step, with who did it and what changed. Append-only.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link href="/audit" className={`rounded-full px-3 py-1 ${!app ? "bg-gray-900 text-white" : "bg-white border border-gray-300"}`}>
          All
        </Link>
        {APPS.map((a) => (
          <Link
            key={a.slug}
            href={`/audit?app=${a.slug}`}
            className={`rounded-full px-3 py-1 ${app === a.slug ? "bg-gray-900 text-white" : "bg-white border border-gray-300"}`}
          >
            {a.name}
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <AuditList entries={entries} />
      </div>
    </div>
  );
}
