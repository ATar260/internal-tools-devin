import { getDb } from "./db";
import { can, canEditField, transitionsFor, type User } from "./auth";
import { type AppDefinition, type Field } from "./schema";

export type RecordRow = {
  id: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  [key: string]: unknown;
};

export interface ListQuery {
  q?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  filters?: Record<string, string>;
}

export interface ListResult {
  rows: RecordRow[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const PAGE_SIZE = 15;

function plain<T>(row: unknown): T {
  // node:sqlite returns null-prototype objects; normalise for React props.
  return { ...(row as object) } as T;
}

export function listRecords(app: AppDefinition, query: ListQuery): ListResult {
  const db = getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (query.q) {
    const searchable = app.fields.filter((f) => f.searchable);
    if (searchable.length) {
      where.push(`(${searchable.map((f) => `"${f.key}" LIKE ?`).join(" OR ")})`);
      searchable.forEach(() => params.push(`%${query.q}%`));
    }
  }

  for (const [key, value] of Object.entries(query.filters ?? {})) {
    const field = app.fields.find((f) => f.key === key);
    if (!field || value === "") continue;
    if (field.type === "boolean") {
      where.push(`"${key}" = ?`);
      params.push(value === "true" ? 1 : 0);
    } else if (field.type === "select" && field.options?.includes(value)) {
      where.push(`"${key}" = ?`);
      params.push(value);
    }
  }

  // Sort column is validated against the schema, never interpolated from input.
  const sortable = new Set([...app.fields.map((f) => f.key), "created_at", "updated_at", "id"]);
  const sort = query.sort && sortable.has(query.sort) ? query.sort : app.defaultSort.field;
  const dir = query.dir === "asc" || query.dir === "desc" ? query.dir : app.defaultSort.dir;

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS n FROM "${app.table}" ${whereSql}`).get(...params) as { n: number }
  ).n;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);

  const rows = db
    .prepare(
      `SELECT * FROM "${app.table}" ${whereSql} ORDER BY "${sort}" ${dir.toUpperCase()}, id ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE)
    .map((r) => plain<RecordRow>(r));

  return { rows, total, page, pageSize: PAGE_SIZE, pages };
}

export function countBy(app: AppDefinition, fieldKey: string): { value: string; count: number }[] {
  const field = app.fields.find((f) => f.key === fieldKey);
  if (!field) return [];
  const db = getDb();
  const rows = db
    .prepare(`SELECT "${fieldKey}" AS value, COUNT(*) AS count FROM "${app.table}" GROUP BY "${fieldKey}"`)
    .all() as { value: string | number | null; count: number }[];
  const byValue = new Map(rows.map((r) => [String(r.value), r.count]));
  const order = field.options ?? [...byValue.keys()];
  return order.map((value) => ({ value, count: byValue.get(value) ?? 0 }));
}

export function countAll(app: AppDefinition): number {
  return (getDb().prepare(`SELECT COUNT(*) AS n FROM "${app.table}"`).get() as { n: number }).n;
}

export function getRecord(app: AppDefinition, id: number): RecordRow | null {
  const row = getDb().prepare(`SELECT * FROM "${app.table}" WHERE id = ?`).get(id);
  return row ? plain<RecordRow>(row) : null;
}

// ---------------------------------------------------------------------------
// Validation

export type FieldErrors = Record<string, string>;

export function coerce(field: Field, raw: FormDataEntryValue | null): unknown {
  if (field.type === "boolean") return raw === "on" || raw === "true" || raw === "1" ? 1 : 0;
  if (raw === null || raw === "") return null;
  const s = String(raw).trim();
  if (field.type === "number" || field.type === "currency") {
    const n = Number(s);
    return Number.isNaN(n) ? s : n;
  }
  return s;
}

export function validate(
  app: AppDefinition,
  fields: Field[],
  values: Record<string, unknown>,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of fields) {
    const v = values[f.key];
    const empty = v === null || v === undefined || v === "";
    if (f.required && f.type !== "boolean" && empty) {
      errors[f.key] = "Required";
      continue;
    }
    if (empty) continue;
    switch (f.type) {
      case "number":
      case "currency":
        if (typeof v !== "number") errors[f.key] = "Must be a number";
        else if (f.min !== undefined && v < f.min) errors[f.key] = `Must be at least ${f.min}`;
        else if (f.max !== undefined && v > f.max) errors[f.key] = `Must be at most ${f.max}`;
        break;
      case "select":
        if (!f.options?.includes(String(v))) errors[f.key] = "Not an allowed value";
        break;
      case "email":
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v))) errors[f.key] = "Not a valid email";
        break;
      case "date":
        if (Number.isNaN(Date.parse(String(v)))) errors[f.key] = "Not a valid date";
        break;
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Mutations. Every one checks permissions and writes an audit entry.

export class ForbiddenError extends Error {}

type Changes = Record<string, [unknown, unknown]>;

function writeAudit(
  user: User,
  app: AppDefinition,
  recordId: number,
  action: "create" | "update" | "delete" | "transition",
  changes: Changes,
  note?: string | null,
) {
  getDb()
    .prepare(
      `INSERT INTO audit_log (ts, actor_id, actor_name, actor_role, app, record_id, action, changes, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      new Date().toISOString(),
      user.id,
      user.name,
      user.role,
      app.slug,
      recordId,
      action,
      JSON.stringify(changes),
      note ?? null,
    );
}

export function createRecord(app: AppDefinition, user: User, values: Record<string, unknown>): number {
  if (!can(user, app, "create")) throw new ForbiddenError("You cannot create records here.");
  const db = getDb();
  const now = new Date().toISOString();
  const keys: string[] = [];
  const vals: unknown[] = [];
  for (const f of app.fields) {
    if (f.readOnly) {
      // Workflow status starts at the first transition's `from` state.
      if (app.workflow?.field === f.key) {
        keys.push(f.key);
        vals.push(app.workflow.transitions[0].from);
      }
      continue;
    }
    if (!canEditField(user, app, f)) continue;
    keys.push(f.key);
    vals.push(values[f.key] ?? null);
  }
  const result = db
    .prepare(
      `INSERT INTO "${app.table}" (created_at, updated_at, created_by, ${keys.map((k) => `"${k}"`).join(", ")})
       VALUES (?, ?, ?, ${keys.map(() => "?").join(", ")})`,
    )
    .run(now, now, user.id, ...(vals as never[]));
  const id = Number(result.lastInsertRowid);
  const changes: Changes = {};
  keys.forEach((k, i) => (changes[k] = [null, vals[i]]));
  writeAudit(user, app, id, "create", changes);
  return id;
}

export function updateRecord(
  app: AppDefinition,
  user: User,
  id: number,
  values: Record<string, unknown>,
): void {
  if (!can(user, app, "update")) throw new ForbiddenError("You cannot edit records here.");
  const before = getRecord(app, id);
  if (!before) throw new Error("Record not found");

  const changes: Changes = {};
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const f of app.fields) {
    if (!canEditField(user, app, f)) continue; // silently keep server value
    if (!(f.key in values)) continue;
    const next = values[f.key] ?? null;
    const prev = before[f.key] ?? null;
    if (prev === next) continue;
    changes[f.key] = [prev, next];
    sets.push(`"${f.key}" = ?`);
    vals.push(next);
  }
  if (!sets.length) return;

  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE "${app.table}" SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`)
    .run(...(vals as never[]), now, id);
  const note = typeof values.change_reason === "string" ? values.change_reason : null;
  writeAudit(user, app, id, "update", changes, note);
}

export function deleteRecord(app: AppDefinition, user: User, id: number): void {
  if (!can(user, app, "delete")) throw new ForbiddenError("You cannot delete records here.");
  const before = getRecord(app, id);
  if (!before) return;
  getDb().prepare(`DELETE FROM "${app.table}" WHERE id = ?`).run(id);
  const changes: Changes = {};
  for (const f of app.fields) changes[f.key] = [before[f.key] ?? null, null];
  writeAudit(user, app, id, "delete", changes);
}

export function transitionRecord(
  app: AppDefinition,
  user: User,
  id: number,
  to: string,
  note: string | null,
): void {
  if (!app.workflow) throw new Error("This app has no workflow");
  const record = getRecord(app, id);
  if (!record) throw new Error("Record not found");

  const option = transitionsFor(user, app, record).find((o) => o.transition.to === to);
  if (!option) throw new ForbiddenError("That transition is not available from the current state.");
  if (!option.allowed) throw new ForbiddenError(option.reason ?? "Not allowed.");
  if (option.transition.requireNote && !note?.trim()) {
    throw new Error("A note is required for this action.");
  }

  const field = app.workflow.field;
  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE "${app.table}" SET "${field}" = ?, updated_at = ? WHERE id = ?`)
    .run(to, now, id);
  writeAudit(user, app, id, "transition", { [field]: [record[field], to] }, note);
}

// ---------------------------------------------------------------------------
// Audit log

export interface AuditEntry {
  id: number;
  ts: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  app: string;
  record_id: number;
  action: "create" | "update" | "delete" | "transition";
  changes: Changes;
  note: string | null;
}

export function listAudit(opts: { app?: string; recordId?: number; limit?: number } = {}): AuditEntry[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.app) {
    where.push("app = ?");
    params.push(opts.app);
  }
  if (opts.recordId !== undefined) {
    where.push("record_id = ?");
    params.push(opts.recordId);
  }
  const rows = getDb()
    .prepare(
      `SELECT * FROM audit_log ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY ts DESC, id DESC LIMIT ?`,
    )
    .all(...params, opts.limit ?? 100) as unknown as (Omit<AuditEntry, "changes"> & { changes: string })[];
  return rows.map((r) => ({ ...r, changes: JSON.parse(r.changes) as Changes }));
}
