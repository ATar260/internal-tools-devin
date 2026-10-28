import Link from "next/link";
import { notFound } from "next/navigation";
import { can, canEditField, getCurrentUser, transitionsFor } from "@/lib/auth";
import { removeRecord, saveRecord } from "@/lib/actions";
import { getRecord, listAudit } from "@/lib/records";
import { getApp } from "@/lib/schema";
import { AuditList } from "@/components/AuditList";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FieldValue } from "@/components/FieldValue";
import { RecordForm } from "@/components/RecordForm";
import { TransitionPanel } from "@/components/TransitionPanel";

export default async function DetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ app: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const { app: slug, id: idStr } = await params;
  const app = getApp(slug);
  if (!app) notFound();
  const user = await getCurrentUser();
  if (!can(user, app, "read")) notFound();

  const id = Number(idStr);
  const record = Number.isInteger(id) ? getRecord(app, id) : null;
  if (!record) notFound();

  const { saved, error, edit } = await searchParams;
  const canUpdate = can(user, app, "update");
  const editing = edit === "1" && canUpdate;
  const editableFields = app.fields.filter((f) => !f.readOnly);
  const disabledKeys = editableFields.filter((f) => !canEditField(user, app, f)).map((f) => f.key);
  const history = listAudit({ app: app.slug, recordId: id, limit: 50 });
  const options = transitionsFor(user, app, record);
  const title = String(record[app.titleField] ?? `#${id}`);

  return (
    <div className="mx-auto max-w-6xl">
      <nav className="text-sm text-gray-500">
        <Link href={`/apps/${app.slug}`} className="hover:underline">
          {app.name}
        </Link>{" "}
        / #{id}
      </nav>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {canUpdate && !editing && (
            <Link
              href={`/apps/${app.slug}/${id}?edit=1`}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              Edit
            </Link>
          )}
          {can(user, app, "delete") && (
            <form action={removeRecord.bind(null, app.slug, id)}>
              <ConfirmButton
                message={`Delete ${title}? This is recorded in the audit log.`}
                className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      {saved && (
        <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">Saved.</div>
      )}
      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            {editing ? (
              <RecordForm
                fields={editableFields}
                disabledKeys={disabledKeys}
                initial={record}
                action={saveRecord.bind(null, app.slug, id)}
                submitLabel="Save"
                cancelHref={`/apps/${app.slug}/${id}`}
              />
            ) : (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {app.fields.map((f) => (
                  <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{f.label}</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">
                      <FieldValue app={app} field={f} value={record[f.key]} record={record} />
                    </dd>
                  </div>
                ))}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">
                    {new Date(record.created_at).toLocaleString("en-GB")} by {record.created_by}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Updated</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{new Date(record.updated_at).toLocaleString("en-GB")}</dd>
                </div>
              </dl>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {app.workflow && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Actions</h2>
              <div className="mt-2">
                <TransitionPanel app={app} id={id} options={options} />
              </div>
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">History</h2>
            <div className="mt-2">
              <AuditList entries={history} showApp={false} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
