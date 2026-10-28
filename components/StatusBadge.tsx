import { humanize, type AppDefinition } from "@/lib/schema";

export function StatusBadge({ app, value }: { app: AppDefinition; value: unknown }) {
  const v = String(value ?? "");
  const color = app.statusColors?.[v] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {humanize(v) || "—"}
    </span>
  );
}
