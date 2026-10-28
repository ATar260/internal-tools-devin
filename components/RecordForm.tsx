"use client";

import { useActionState } from "react";
import type { Field } from "@/lib/schema";
import type { FormState } from "@/lib/actions";

const inputClass =
  "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500";

export function RecordForm({
  fields,
  disabledKeys,
  initial,
  action,
  submitLabel,
  cancelHref,
}: {
  /** Visible fields, already filtered for this user (serialisable only). */
  fields: Field[];
  /** Fields shown but not editable by this user. */
  disabledKeys: string[];
  initial: Record<string, unknown>;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const disabled = new Set(disabledKeys);

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map((f) => {
          const error = state?.errors?.[f.key];
          const isDisabled = disabled.has(f.key);
          const value = initial[f.key];
          const wide = f.type === "textarea";
          return (
            <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
              <label htmlFor={f.key} className="block text-sm font-medium text-gray-700">
                {f.label}
                {f.required && !isDisabled && <span className="text-red-500"> *</span>}
                {isDisabled && <span className="ml-2 text-xs font-normal text-gray-400">read-only for your role</span>}
              </label>
              <div className="mt-1">{renderInput(f, value, isDisabled)}</div>
              {f.help && !error && <p className="mt-1 text-xs text-gray-500">{f.help}</p>}
              {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <a href={cancelHref} className="text-sm text-gray-600 hover:underline">
          Cancel
        </a>
      </div>
    </form>
  );
}

function renderInput(f: Field, value: unknown, disabled: boolean) {
  const common = { id: f.key, name: f.key, disabled, className: inputClass };
  switch (f.type) {
    case "textarea":
      return <textarea {...common} rows={3} defaultValue={value == null ? "" : String(value)} />;
    case "boolean":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            id={f.key}
            name={f.key}
            type="checkbox"
            disabled={disabled}
            defaultChecked={Boolean(value)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-gray-600">{f.label}</span>
        </label>
      );
    case "select":
      return (
        <select {...common} defaultValue={value == null ? "" : String(value)}>
          <option value="">— select —</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      );
    case "number":
    case "currency":
      return (
        <input
          {...common}
          type="number"
          step={f.type === "currency" ? "0.01" : "1"}
          min={f.min}
          max={f.max}
          defaultValue={value == null ? "" : String(value)}
        />
      );
    case "date":
      return <input {...common} type="date" defaultValue={value == null ? "" : String(value).slice(0, 10)} />;
    case "email":
      return <input {...common} type="email" defaultValue={value == null ? "" : String(value)} />;
    default:
      return <input {...common} type="text" defaultValue={value == null ? "" : String(value)} />;
  }
}
