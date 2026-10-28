import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { APPS, type AppDefinition, type Field } from "./schema";
import { seed } from "./seed";

const DB_PATH =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");

declare global {
  // Survive hot reloads in development.
  var __internalToolsDb: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (globalThis.__internalToolsDb) return globalThis.__internalToolsDb;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db);
  seed(db);
  globalThis.__internalToolsDb = db;
  return db;
}

function sqlType(f: Field): string {
  switch (f.type) {
    case "number":
    case "currency":
      return "REAL";
    case "boolean":
      return "INTEGER";
    default:
      return "TEXT";
  }
}

/**
 * Creates one table per app from its field list, and adds any columns that
 * were added to the schema since the table was created. Dropping or renaming
 * a column is deliberately not automated: that needs a human.
 */
function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      app TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      changes TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS audit_app_record ON audit_log(app, record_id);
  `);

  for (const app of APPS) ensureTable(db, app);
}

function ensureTable(db: DatabaseSync, app: AppDefinition) {
  const cols = app.fields.map((f) => `"${f.key}" ${sqlType(f)}`).join(",\n      ");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${app.table}" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      ${cols}
    )
  `);

  const existing = new Set(
    (db.prepare(`PRAGMA table_info("${app.table}")`).all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );
  for (const f of app.fields) {
    if (!existing.has(f.key)) {
      db.exec(`ALTER TABLE "${app.table}" ADD COLUMN "${f.key}" ${sqlType(f)}`);
    }
  }
}
