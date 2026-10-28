# Loom script (target 4:30, hard cap 5:00)

Audience: the VP of Engineering. Screen share the running app; switch users as you go.

## 0:00 – 0:35  What Power Apps is actually giving you

"You pay $250K a year, and it's worth separating what that buys. The screen builder is
the visible part, but a React admin page is a solved problem. The parts that are hard
to replace are: a governed data layer with row- and field-level security, approval
workflows with business rules, an audit trail your compliance team trusts, SSO and
data-loss-prevention policies that your security team already signed off, and
Microsoft running all of it. Keep that list in mind, because it's the yardstick."

## 0:35 – 2:15  What I built in two hours with Devin

Show `lib/schema.ts` for ten seconds: "Each tool is this object. Fields, who can do
what, and a workflow."

Switch to the app as **Priya (support)**, open a refund over 1,000: "Approve is
disabled and tells her why. That rule is one line in the schema and it's enforced on
the server, not just in the button." Reject with a note → history entry appears.

Switch to **Daniel (compliance)**, KYC queue: status chips, filter to in_review,
open a risk-87 case: "Same mechanism, different rule." Open the edit form as Priya
on a refund: "payment ref is read-only for her role. Field-level security."

Switch to **Lena (engineer)**, create a feature flag with a blank reason → server
validation. Fill it in → audit log shows the diff and the reason.

"Three apps, one engine, about 150 lines of config. The fourth app is a config
change, and that's the Devin task: 'add the chargeback-disputes tool with these
fields and this approval rule' is a one-paragraph ticket your engineers review in
ten minutes."

## 2:15 – 3:15  Honest assessment

"Replicable, and I'd say better in code: CRUD screens, permissions, workflow, audit,
and anything with real business logic, because now it's in git with tests and code
review.

Not replicable cheaply: the 1,000 connectors, offline mobile, Teams embedding, and
above all the governance layer: SSO, DLP, environments, compliance attestations.
You'd be building that or buying pieces of it.

Where the risk lies: not in the code. It's in ownership. Power Apps has no on-call
rota. The moment this is yours, someone owns patching, the database, the identity
integration and the 2 a.m. page when the refunds tool is down. With 60 engineers you
can absorb that, but it's a real cost, and it's the cost that the $250K is hiding."

## 3:15 – 4:15  Recommendation

"Build, but not all of it, and not all at once.

The thing that tips it is the 'ten more apps' part. At three apps, $250K is
expensive but the governance you get is real. At thirteen apps, the per-app
licence cost grows, the Power Apps customisation ceiling starts biting on exactly
the tools a fintech cares most about (anything touching money or KYC), and you
already have 60 engineers who would rather work in a codebase.

So: keep Power Apps for the long tail of low-risk, business-owned apps where the
designer is the point. Build the money-and-compliance tools on an engine like this,
with Devin doing the per-app work and your platform team owning the engine, identity
and the audit store. That might take you from $250K to a smaller Power Apps tier
rather than zero, and that's fine."

## 4:15 – 4:45  Next steps

"If you want to proceed: a two-week pilot. Pick the refunds tool because it has the
sharpest rules. Platform team wires Okta and Postgres into this engine, one engineer
drives Devin to rebuild refunds with tests, security reviews the audit log and the
permission model, and finance uses it in parallel with the Power Apps version for a
week. At the end you'll know the real maintenance cost, not my estimate.

If you decide to stay on Power Apps: still worth using Devin to clear the backlog of
integration and glue code around it, which is where Power Apps projects usually
stall. Either way, thanks for the time."
