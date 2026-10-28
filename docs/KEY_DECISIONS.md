# Key Decisions

**Scope.** I did not build three apps. I built one engine and described three apps to
it. The client's real question is not "can Devin build a refunds dashboard" (yes,
trivially) but "can we build the *next ten* without each one being a project." Power
Apps answers that with a model-driven designer; the equivalent in code is a schema
file. So the two hours went into `lib/schema.ts` and the generic engine, and the three
apps are ~150 lines of configuration between them. The fourth app is a config change.

**What I chose to replicate, and why these four.** Of everything Power Apps does, the
features a fintech internal-tools team actually leans on are: generated CRUD screens,
role-based permissions down to field level, status workflows with approval rules, and
an audit trail compliance can hand to an auditor. Those four are in the prototype and
work end to end. I skipped the visual designer, connectors, mobile/offline and Teams
embedding on purpose: they are either not where this client's value is (nobody is
reviewing KYC on a phone) or they are exactly the things you should not try to
rebuild (connectors).

**Business rules live in data, enforced on the server.** The "refunds over 1,000 need
finance" rule is a declarative `escalate` clause on a transition, evaluated in one
function (`transitionsFor`) that both the button rendering and the server action
call. The UI disabling a button is never the authorization; the action re-checks.
This is the single most important property for a fintech and the easiest one to get
wrong when an agent generates screens quickly, so I made it structural rather than a
convention.

**No ORM, no auth library, no component library.** SQLite via `node:sqlite`, raw SQL
with column names whitelisted against the schema, a cookie that names a demo user.
Each of these is a deliberate "swap later" seam: Postgres replaces the DB file, an
OIDC session replaces `lib/auth.ts`, and nothing above those layers changes. Adding
Prisma and NextAuth would have cost half the time budget on plumbing that proves
nothing about the question being asked.

**Schema evolution is additive only.** Startup creates missing tables and adds
missing columns. It never drops or renames. Destructive migrations in a tool that
holds KYC data should go through a human and a reviewed migration file.

**Tradeoffs I accepted.** Forms are server-rendered with one client component for
validation state, so there is no optimistic UI. Search is `LIKE`, fine for tens of
thousands of rows, not millions. The audit log stores diffs as JSON, which is right
for reading and wrong for querying "every change to field X"; that's a later index.
There are no tests, which is the first thing I would ask Devin for next.

**Where Devin fit.** The build splits into three sessions with crisp acceptance
checks (see `docs/DEVIN_PROMPTS.md`): engine, screens, rules. The leverage Devin
gives is not that it writes React faster; it is that once the schema exists, "add
the chargeback-disputes app" is a one-paragraph ticket an engineer can review in
ten minutes. That is the Power Apps experience, with git, tests and a real codebase
underneath. What Devin does not give you is the governance Power Apps ships with on
day one, and that is where the build-vs-buy recommendation turns.
