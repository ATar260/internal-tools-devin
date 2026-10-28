import Link from "next/link";
import { notFound } from "next/navigation";
import { can, canEditField, getCurrentUser } from "@/lib/auth";
import { saveRecord } from "@/lib/actions";
import { getApp } from "@/lib/schema";
import { RecordForm } from "@/components/RecordForm";

export default async function NewPage({ params }: { params: Promise<{ app: string }> }) {
  const { app: slug } = await params;
  const app = getApp(slug);
  if (!app) notFound();
  const user = await getCurrentUser();
  if (!can(user, app, "create")) notFound();

  const fields = app.fields.filter((f) => !f.readOnly);
  const disabledKeys = fields.filter((f) => !canEditField(user, app, f)).map((f) => f.key);
  const action = saveRecord.bind(null, app.slug, null);

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="text-sm text-gray-500">
        <Link href={`/apps/${app.slug}`} className="hover:underline">
          {app.name}
        </Link>{" "}
        / New
      </nav>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">New {app.name.replace(/ (Queue|Dashboard|Admin)$/, "")} record</h1>
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <RecordForm
          fields={fields}
          disabledKeys={disabledKeys}
          initial={{}}
          action={action}
          submitLabel="Create"
          cancelHref={`/apps/${app.slug}`}
        />
      </div>
    </div>
  );
}
