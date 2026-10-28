import { humanize, type AppDefinition, type Field } from "@/lib/schema";
import { StatusBadge } from "./StatusBadge";

export function FieldValue({
  app,
  field,
  value,
  record,
}: {
  app: AppDefinition;
  field: Field;
  value: unknown;
  record?: Record<string, unknown>;
}) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">—</span>;
  switch (field.type) {
    case "boolean":
      return value ? (
        <span className="text-green-700 font-medium">Yes</span>
      ) : (
        <span className="text-gray-500">No</span>
      );
    case "currency": {
      const currency = typeof record?.currency === "string" ? record.currency : "GBP";
      return (
        <span className="tabular-nums">
          {new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(Number(value))}
        </span>
      );
    }
    case "number":
      return <span className="tabular-nums">{String(value)}</span>;
    case "select":
      if (app.statusColors && String(value) in app.statusColors) {
        return <StatusBadge app={app} value={value} />;
      }
      return <>{humanize(String(value))}</>;
    case "date":
      return <>{String(value).slice(0, 10)}</>;
    case "textarea":
      return <span className="whitespace-pre-wrap">{String(value)}</span>;
    default:
      return <>{String(value)}</>;
  }
}
