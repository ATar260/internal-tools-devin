# Internal Tools (Devin vs Power Apps prototype)

A schema-driven internal tools platform. Three apps a fintech would normally build in
Power Apps, each defined as a plain object in [`lib/schema.ts`](lib/schema.ts), with the
list / detail / create / edit screens, role permissions, approval workflow and audit log
generated from that definition.

| App | What it shows |
| --- | --- |
| **KYC Review Queue** | Status workflow, required notes on reject/escalate, business rule: risk score ≥ 70 needs an admin to approve. Field-level security on `risk_score`. |
| **Refunds Dashboard** | Approval threshold: refunds over 1,000 need finance or admin. Finance-only `payment_ref` field. Status counts and filters. |
| **Feature Flag Admin** | No workflow, but every change requires a reason that lands in the audit log. Per-environment rows. |

Everything a user does (create, edit, delete, workflow step) is written to an
append-only `audit_log` with who, when, and a before/after diff.

## Run it

Requires Node 22.5 or later (it uses the built-in `node:sqlite`, so there are no native
dependencies).

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a demo user. The database is created and seeded on first
request at `data/app.db`; delete that file to reset.

| User | Role | Try this |
| --- | --- | --- |
| Amara Okafor | admin | Can do everything, including approve high-risk KYC and delete. |
| Daniel Reyes | compliance | Work the KYC queue. Approve is disabled on risk ≥ 70. |
| Priya Nair | support | Raise and approve small refunds. Approve is disabled over 1,000. `payment_ref` is read-only. |
| Tom Whitfield | finance | Approve any refund, mark paid, set `payment_ref`. |
| Lena Fischer | engineer | Create and edit feature flags. Cannot touch KYC or refunds. |
| Sam Chen | viewer | Read-only everywhere. No New / Edit / Delete buttons, and the routes 404. |

## Add a fourth app

Add an entry to `APPS` in `lib/schema.ts`. On the next request the table is created
(or new columns are added to an existing one), and `/apps/<slug>` works with search,
filters, sorting, pagination, forms with validation, permissions and audit. No new
pages or SQL.

## How it is put together

```
lib/schema.ts      app definitions: fields, permissions, workflow, business rules
lib/db.ts          node:sqlite connection, table creation / column add from schema, seed
lib/records.ts     generic list/get/create/update/delete/transition + validation + audit
lib/auth.ts        demo session, can(), canEditField(), transitionsFor()
lib/actions.ts     server actions (the only write path; every one re-checks permissions)
app/(app)/apps/[app]/...   list, new, detail screens rendered from the schema
app/(app)/audit    global audit log
```

Stack: Next.js 16 (App Router, server actions), React 19, Tailwind 4, SQLite via
`node:sqlite`. No ORM, no auth library, no component library. See
[`docs/KEY_DECISIONS.md`](docs/KEY_DECISIONS.md) for why.

## What is deliberately not here

- **Real identity.** The login screen is a user picker. In production, swap
  `lib/auth.ts` for an OIDC session (Okta / Entra ID) and map group claims to `Role`.
  Nothing downstream changes.
- **Connectors.** Power Apps' 1,000+ connectors are not replicated. Each app here owns
  its data; integrating with Stripe, the core ledger or Salesforce is ordinary
  engineering work per integration.
- **Mobile / offline**, Teams embedding, a visual designer, Dataverse-style
  managed environments and DLP policies. These are the parts of Power Apps you are
  really paying for, and the honest assessment in the Loom covers them.
- **Tests.** A two-hour prototype does not get a test suite. The first thing to ask
  Devin for after this would be integration tests over `lib/records.ts`.
