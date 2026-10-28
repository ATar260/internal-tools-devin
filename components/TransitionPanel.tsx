import { applyTransition } from "@/lib/actions";
import type { TransitionOption } from "@/lib/auth";
import type { AppDefinition } from "@/lib/schema";

const styles = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  neutral: "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50",
};

export function TransitionPanel({
  app,
  id,
  options,
}: {
  app: AppDefinition;
  id: number;
  options: TransitionOption[];
}) {
  if (!options.length) {
    return <p className="text-sm text-gray-500">No further actions from this state.</p>;
  }
  return (
    <div className="space-y-3">
      {options.map(({ transition: t, allowed, reason }) => {
        const action = applyTransition.bind(null, app.slug, id, t.to);
        return (
          <form key={t.to} action={action} className="rounded-md border border-gray-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{t.label}</div>
                <div className="text-xs text-gray-500">
                  {t.from.replace(/_/g, " ")} → {t.to.replace(/_/g, " ")}
                </div>
                {!allowed && reason && <div className="mt-1 text-xs text-amber-700">{reason}</div>}
              </div>
              <button
                type="submit"
                disabled={!allowed}
                className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${styles[t.style ?? "neutral"]}`}
              >
                {t.label}
              </button>
            </div>
            {allowed && (
              <textarea
                name="note"
                rows={2}
                required={t.requireNote}
                placeholder={t.requireNote ? "Note (required)" : "Note (optional)"}
                className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
              />
            )}
          </form>
        );
      })}
    </div>
  );
}
