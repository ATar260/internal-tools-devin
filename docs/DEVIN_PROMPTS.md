# Devin playbook: how this would be built session by session

The brief asks that Devin be the primary building tool. This is the sequence of
sessions a client engineer would run to produce this repo, with the prompt and what
to check before accepting the PR. Each is sized so Devin can finish in one session
and the reviewer can read the diff in under ten minutes.

## Session 1: scaffold and schema engine (~40 min)

> Create a Next.js 16 App Router + TypeScript + Tailwind project. Use the built-in
> `node:sqlite` module, no ORM. Build a schema-driven internal tools engine:
> `lib/schema.ts` exports an `APPS` array where each app has `slug`, `name`, `table`,
> `fields` (key, label, type: text/textarea/email/number/currency/boolean/select/date,
> required, options, min/max, help, searchable, hideInList, editableBy roles,
> readOnly), `permissions` (read/create/update/delete → roles), optional `workflow`
> (status field + transitions with from/to/label/roles/requireNote), and
> `defaultSort`. `lib/db.ts` creates one table per app from its fields on startup and
> adds missing columns. `lib/records.ts` implements list (search over searchable
> fields, select/boolean filters, sort validated against the schema, pagination),
> get, create, update, delete, and transition. Every mutation writes a row to
> `audit_log` with actor, action, and a JSON before/after diff.

Review: sort column must be whitelisted against the schema, never interpolated from
the query string. Check `updateRecord` ignores fields the role cannot edit instead of
erroring, so a stale form cannot overwrite a protected field.

## Session 2: screens (~40 min)

> Under `app/(app)/apps/[app]/` build three server-rendered screens from the schema:
> list (filter chips with counts by workflow status, search box, per-field filters,
> sortable headers, pagination), new (form with server-side validation errors returned
> via `useActionState`), and detail (read view, `?edit=1` edit view, workflow action
> buttons with note box, per-record history). Add `/audit` with an app filter and a
> home page with a card per app. Demo login page that sets a cookie for one of six
> seeded users with different roles. Hide buttons the role cannot use and also 404 the
> route.

Review: server actions must re-check `can()` themselves. The UI hiding a button is
not authorization.

## Session 3: business rules and seed (~30 min)

> Add an `escalate` option to workflow transitions: `{ when: { field, gt|gte|lt|lte|eq },
> roles, message }`. When the condition matches, only those roles may perform the
> transition and the UI shows the message on the disabled button. Use it for KYC
> approve on risk_score ≥ 70 (admin only) and refund approve on amount > 1000
> (finance/admin). Seed ~28 KYC rows, ~22 refunds, 18 flags deterministically.

Review: the rule must be evaluated in `transitionRecord` on the server, not only in
the component that renders the button.

## Session 4 (not done, next on the list)

> Write integration tests for `lib/records.ts` covering permissions, field-level
> security, escalation rules and audit diffs. Then replace the demo login with
> `openid-client` against our Okta tenant, mapping the `groups` claim to `Role`.

## Observations on using Devin this way

- Devin is at its best when the task has a crisp acceptance test ("viewer gets 404 on
  /new") and a bounded surface (one file or one screen). Sessions 1–3 fit that.
- The schema file is the leverage point: once it exists, "add a fourth app" is a
  one-paragraph Devin task that touches one file. That is the Power Apps-like
  experience, minus the drag-and-drop.
- The things Devin should not be asked to improvise are the same things that are
  risky for a human: identity, secrets, production data access. Those get decided by
  the platform team and handed to Devin as constraints.
