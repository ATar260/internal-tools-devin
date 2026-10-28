import Link from "next/link";
import type { AuditEntry } from "@/lib/records";
import { getApp } from "@/lib/schema";

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "∅";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return String(v);
}

export function AuditList({ entries, showApp = true }: { entries: AuditEntry[]; showApp?: boolean }) {
  if (!entries.length) return <p className="text-sm text-gray-500">Nothing yet.</p>;
  return (
    <ol className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
      {entries.map((e) => {
        const app = getApp(e.app);
        const changed = Object.entries(e.changes);
        return (
          <li key={e.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="font-medium text-gray-900">{e.actor_name}</span>
                <span className="text-gray-500"> ({e.actor_role}) </span>
                <span className="text-gray-700">{verb(e.action)}</span>{" "}
                {showApp && app && (
                  <Link href={`/apps/${app.slug}/${e.record_id}`} className="text-blue-700 hover:underline">
                    {app.name} #{e.record_id}
                  </Link>
                )}
              </div>
              <time className="text-xs text-gray-500" dateTime={e.ts}>
                {new Date(e.ts).toLocaleString("en-GB")}
              </time>
            </div>
            {changed.length > 0 && e.action !== "delete" && (
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                {changed.slice(0, 6).map(([k, [before, after]]) => (
                  <li key={k}>
                    <span className="font-mono">{k}</span>: {fmt(before)} → <span className="text-gray-900">{fmt(after)}</span>
                  </li>
                ))}
                {changed.length > 6 && <li>…and {changed.length - 6} more</li>}
              </ul>
            )}
            {e.note && <p className="mt-1 text-xs italic text-gray-600">“{e.note}”</p>}
          </li>
        );
      })}
    </ol>
  );
}

function verb(action: AuditEntry["action"]): string {
  switch (action) {
    case "create":
      return "created";
    case "update":
      return "edited";
    case "delete":
      return "deleted";
    case "transition":
      return "moved";
  }
}
