import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getCurrentUser } from "@/lib/auth";
import { countBy, listRecords } from "@/lib/records";
import { getApp, humanize } from "@/lib/schema";
import { FieldValue } from "@/components/FieldValue";

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ app: string }>;
  searchParams: Promise<Search>;
}) {
  const { app: slug } = await params;
  const app = getApp(slug);
  if (!app) notFound();
  const user = await getCurrentUser();
  if (!can(user, app, "read")) notFound();

  const sp = await searchParams;
  const q = one(sp.q);
  const sort = one(sp.sort);
  const dir = one(sp.dir) as "asc" | "desc" | "";
  const page = Number(one(sp.page) || 1);
  const filterFields = app.fields.filter((f) => f.type === "select" || f.type === "boolean");
  const filters: Record<string, string> = {};
  for (const f of filterFields) {
    const v = one(sp[`f_${f.key}`]);
    if (v) filters[f.key] = v;
  }

  const result = listRecords(app, { q, sort: sort || undefined, dir: dir || undefined, page, filters });
  const columns = app.fields.filter((f) => !f.hideInList);
  const stats = app.workflow ? countBy(app, app.workflow.field) : null;

  const hrefWith = (overrides: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const base: Record<string, string | undefined> = { q, sort, dir, ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [`f_${k}`, v])) };
    for (const [k, v] of Object.entries({ ...base, ...overrides })) if (v) u.set(k, v);
    const s = u.toString();
    return `/apps/${app.slug}${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{app.name}</h1>
          <p className="mt-1 text-sm text-gray-600">{app.description}</p>
        </div>
        {can(user, app, "create") && (
          <Link
            href={`/apps/${app.slug}/new`}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            New
          </Link>
        )}
      </div>

      {stats && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {stats.map((s) => (
            <li key={s.value}>
              <Link
                href={hrefWith({ [`f_${app.workflow!.field}`]: filters[app.workflow!.field] === s.value ? undefined : s.value, page: undefined })}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${
                  filters[app.workflow!.field] === s.value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{humanize(s.value)}</span>
                <span className="tabular-nums font-semibold">{s.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3 rounded-md border border-gray-200 bg-white p-3">
        <div className="min-w-48 flex-1">
          <label className="block text-xs font-medium text-gray-600">Search</label>
          <input
            name="q"
            defaultValue={q}
            placeholder={app.fields.filter((f) => f.searchable).map((f) => f.label.toLowerCase()).join(", ")}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
        {filterFields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-600">{f.label}</label>
            <select name={`f_${f.key}`} defaultValue={filters[f.key] ?? ""} className="mt-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="">Any</option>
              {f.type === "boolean" ? (
                <>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </>
              ) : (
                f.options?.map((o) => (
                  <option key={o} value={o}>
                    {humanize(o)}
                  </option>
                ))
              )}
            </select>
          </div>
        ))}
        {sort && <input type="hidden" name="sort" value={sort} />}
        {dir && <input type="hidden" name="dir" value={dir} />}
        <button className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">Apply</button>
        <Link href={`/apps/${app.slug}`} className="text-sm text-gray-600 hover:underline">
          Clear
        </Link>
      </form>

      <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {columns.map((f) => {
                const active = (sort || app.defaultSort.field) === f.key;
                const nextDir = active && (dir || app.defaultSort.dir) === "asc" ? "desc" : "asc";
                return (
                  <th key={f.key} className="px-3 py-2 font-medium">
                    <Link href={hrefWith({ sort: f.key, dir: nextDir, page: undefined })} className="hover:text-gray-900">
                      {f.label}
                      {active && <span className="ml-1">{(dir || app.defaultSort.dir) === "asc" ? "↑" : "↓"}</span>}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500">
                  No records match.
                </td>
              </tr>
            )}
            {result.rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {columns.map((f, i) => (
                  <td key={f.key} className="px-3 py-2 align-top">
                    {i === 0 ? (
                      <Link href={`/apps/${app.slug}/${row.id}`} className="font-medium text-blue-700 hover:underline">
                        <FieldValue app={app} field={f} value={row[f.key]} record={row} />
                      </Link>
                    ) : (
                      <FieldValue app={app} field={f} value={row[f.key]} record={row} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
        <span>
          {result.total} record{result.total === 1 ? "" : "s"} · page {result.page} of {result.pages}
        </span>
        <div className="flex gap-2">
          {result.page > 1 && (
            <Link href={hrefWith({ page: String(result.page - 1) })} className="rounded-md border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">
              Previous
            </Link>
          )}
          {result.page < result.pages && (
            <Link href={hrefWith({ page: String(result.page + 1) })} className="rounded-md border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50">
              Next
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
