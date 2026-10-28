import type { DatabaseSync } from "node:sqlite";
import { APPS } from "./schema";

/** Deterministic pseudo-random so every fresh database looks the same. */
function rng(seedValue: number) {
  let s = seedValue >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

const FIRST = ["Aisha", "Ben", "Chloe", "Dev", "Elena", "Femi", "Grace", "Hugo", "Isla", "Jonas", "Kemi", "Luca", "Maya", "Noah", "Olu", "Pia", "Quinn", "Rosa", "Sven", "Tara", "Uma", "Vik", "Wren", "Yusuf", "Zara"];
const LAST = ["Adeyemi", "Brown", "Costa", "Dubois", "Evans", "Fischer", "Garcia", "Hassan", "Ito", "Jensen", "Khan", "Lopez", "Murphy", "Nakamura", "Okafor", "Patel", "Rossi", "Singh", "Tanaka", "Walsh"];

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

export function seed(db: DatabaseSync) {
  const r = rng(42);
  const now = new Date().toISOString();

  for (const app of APPS) {
    const count = (db.prepare(`SELECT COUNT(*) AS n FROM "${app.table}"`).get() as { n: number }).n;
    if (count > 0) continue;

    const rows: Record<string, unknown>[] = [];

    if (app.slug === "kyc") {
      for (let i = 0; i < 28; i++) {
        const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
        const risk = Math.floor(r() * 100);
        const status = pick(r, ["pending", "pending", "pending", "in_review", "in_review", "approved", "rejected", "escalated"]);
        rows.push({
          customer_name: name,
          email: `${name.toLowerCase().replace(" ", ".")}@example.com`,
          country: pick(r, ["GB", "US", "DE", "FR", "NG", "IN", "BR", "SG"]),
          document_type: pick(r, ["passport", "driving_licence", "national_id"]),
          risk_score: risk,
          pep_match: risk > 85 ? 1 : 0,
          submitted_at: daysAgo(Math.floor(r() * 14)).slice(0, 10),
          status,
          assignee: status === "pending" ? null : "Daniel Reyes",
          notes: null,
        });
      }
    }

    if (app.slug === "refunds") {
      for (let i = 0; i < 22; i++) {
        const big = r() < 0.25;
        const amount = big ? Math.round((1000 + r() * 4000) * 100) / 100 : Math.round(r() * 900 * 100) / 100 + 5;
        const status = pick(r, ["requested", "requested", "requested", "approved", "paid", "paid", "rejected"]);
        rows.push({
          order_id: `ORD-${10000 + Math.floor(r() * 90000)}`,
          customer_email: `${pick(r, FIRST).toLowerCase()}.${pick(r, LAST).toLowerCase()}@example.com`,
          amount,
          currency: pick(r, ["GBP", "GBP", "USD", "EUR"]),
          reason: pick(r, ["duplicate_charge", "fraud", "product_issue", "goodwill", "other"]),
          status,
          payment_ref: status === "paid" ? `PAY-${Math.floor(r() * 1e6)}` : null,
          notes: null,
        });
      }
    }

    if (app.slug === "flags") {
      const defs: [string, string, string][] = [
        ["payments.instant_refunds", "Pay refunds straight back to card instead of batch.", "payments"],
        ["onboarding.selfie_check", "Require a liveness selfie during KYC.", "onboarding"],
        ["risk.velocity_rules_v2", "New velocity rule set from the risk team.", "risk"],
        ["platform.new_dashboard", "Redesigned account dashboard.", "platform"],
        ["growth.referral_bonus", "Show referral bonus banner.", "growth"],
        ["payments.3ds_challenge_all", "Force 3DS challenge on every card payment.", "payments"],
      ];
      for (const [key, description, owner_team] of defs) {
        for (const environment of ["development", "staging", "production"]) {
          const enabled = environment === "production" ? (r() < 0.4 ? 1 : 0) : 1;
          rows.push({
            key,
            description,
            environment,
            enabled,
            rollout_percent: enabled ? (environment === "production" ? pick(r, [5, 25, 50, 100]) : 100) : 0,
            owner_team,
            change_reason: "Initial import",
          });
        }
      }
    }

    const keys = app.fields.map((f) => f.key);
    const stmt = db.prepare(
      `INSERT INTO "${app.table}" (created_at, updated_at, created_by, ${keys.map((k) => `"${k}"`).join(", ")})
       VALUES (?, ?, ?, ${keys.map(() => "?").join(", ")})`,
    );
    const insertAll = () => {
      for (const row of rows) {
        const created = daysAgo(Math.floor(r() * 30));
        stmt.run(created, created, "seed", ...keys.map((k) => (row[k] ?? null) as never));
      }
    };
    db.exec("BEGIN");
    try {
      insertAll();
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    void now;
  }
}
