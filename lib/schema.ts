/**
 * App definitions.
 *
 * This file is the whole "low-code" surface of the prototype. Each internal
 * tool is a plain object: fields, who can do what, and (optionally) a status
 * workflow with business rules. The generic engine in lib/records.ts and the
 * pages under app/(app)/apps/[app] render list, detail, create and edit
 * screens from these definitions, so a new tool is a new entry here, not a
 * new set of pages.
 */

export type Role =
  | "admin"
  | "compliance"
  | "support"
  | "finance"
  | "engineer"
  | "viewer";

export const ROLES: Role[] = [
  "admin",
  "compliance",
  "support",
  "finance",
  "engineer",
  "viewer",
];

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "currency"
  | "boolean"
  | "select"
  | "date";

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Allowed values for `select` fields. */
  options?: string[];
  min?: number;
  max?: number;
  help?: string;
  /** Included in free-text search on the list screen. */
  searchable?: boolean;
  /** Hidden from the list table (still shown on the detail screen). */
  hideInList?: boolean;
  /** Field-level security: only these roles may edit. Others see it read-only. */
  editableBy?: Role[];
  /** System-managed: never editable through the form (e.g. workflow status). */
  readOnly?: boolean;
}

export interface Condition {
  field: string;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  eq?: string | number | boolean;
}

export interface Transition {
  from: string;
  to: string;
  label: string;
  roles: Role[];
  /** Force the actor to leave a note (captured in the audit log). */
  requireNote?: boolean;
  /**
   * Business rule: when the condition holds, a different (usually narrower)
   * set of roles is required. Mirrors Power Apps "business rules" and
   * approval thresholds.
   */
  escalate?: { when: Condition; roles: Role[]; message: string };
  style?: "primary" | "danger" | "neutral";
}

export interface Workflow {
  /** The select field that holds the status. */
  field: string;
  transitions: Transition[];
}

export type Action = "read" | "create" | "update" | "delete";

export interface AppDefinition {
  slug: string;
  name: string;
  description: string;
  table: string;
  /** Field used as the record's display name. */
  titleField: string;
  fields: Field[];
  permissions: Record<Action, Role[]>;
  workflow?: Workflow;
  defaultSort: { field: string; dir: "asc" | "desc" };
  /** Optional colours for status chips, by value. */
  statusColors?: Record<string, string>;
}

const EVERYONE: Role[] = [...ROLES];

export const APPS: AppDefinition[] = [
  {
    slug: "kyc",
    name: "KYC Review Queue",
    description:
      "Compliance reviews new customer identity checks. High-risk cases need an admin.",
    table: "kyc_reviews",
    titleField: "customer_name",
    defaultSort: { field: "submitted_at", dir: "asc" },
    fields: [
      { key: "customer_name", label: "Customer", type: "text", required: true, searchable: true },
      { key: "email", label: "Email", type: "email", required: true, searchable: true },
      {
        key: "country",
        label: "Country",
        type: "select",
        required: true,
        options: ["GB", "US", "DE", "FR", "NG", "IN", "BR", "SG"],
      },
      {
        key: "document_type",
        label: "Document",
        type: "select",
        required: true,
        options: ["passport", "driving_licence", "national_id"],
      },
      {
        key: "risk_score",
        label: "Risk score",
        type: "number",
        min: 0,
        max: 100,
        help: "From the screening vendor. 70 or above needs an admin to approve.",
        editableBy: ["compliance", "admin"],
      },
      { key: "pep_match", label: "PEP match", type: "boolean", help: "Politically exposed person hit." },
      { key: "submitted_at", label: "Submitted", type: "date", required: true },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["pending", "in_review", "approved", "rejected", "escalated"],
        readOnly: true,
      },
      { key: "assignee", label: "Assignee", type: "text" },
      { key: "notes", label: "Notes", type: "textarea", hideInList: true },
    ],
    permissions: {
      read: EVERYONE,
      create: ["support", "compliance", "admin"],
      update: ["compliance", "admin"],
      delete: ["admin"],
    },
    workflow: {
      field: "status",
      transitions: [
        { from: "pending", to: "in_review", label: "Start review", roles: ["compliance", "admin"], style: "primary" },
        {
          from: "in_review",
          to: "approved",
          label: "Approve",
          roles: ["compliance", "admin"],
          style: "primary",
          escalate: {
            when: { field: "risk_score", gte: 70 },
            roles: ["admin"],
            message: "Risk score is 70 or above, so only an admin can approve.",
          },
        },
        { from: "in_review", to: "rejected", label: "Reject", roles: ["compliance", "admin"], requireNote: true, style: "danger" },
        { from: "in_review", to: "escalated", label: "Escalate", roles: ["compliance", "admin"], requireNote: true },
        { from: "escalated", to: "approved", label: "Approve", roles: ["admin"], style: "primary" },
        { from: "escalated", to: "rejected", label: "Reject", roles: ["admin"], requireNote: true, style: "danger" },
        { from: "rejected", to: "in_review", label: "Reopen", roles: ["admin"] },
      ],
    },
    statusColors: {
      pending: "bg-gray-100 text-gray-700",
      in_review: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      escalated: "bg-amber-100 text-amber-800",
    },
  },
  {
    slug: "refunds",
    name: "Refunds Dashboard",
    description:
      "Support raises refunds, finance pays them out. Anything over 1,000 needs finance or an admin.",
    table: "refunds",
    titleField: "order_id",
    defaultSort: { field: "created_at", dir: "desc" },
    fields: [
      { key: "order_id", label: "Order", type: "text", required: true, searchable: true },
      { key: "customer_email", label: "Customer", type: "email", required: true, searchable: true },
      { key: "amount", label: "Amount", type: "currency", required: true, min: 0.01 },
      { key: "currency", label: "Currency", type: "select", required: true, options: ["GBP", "USD", "EUR"] },
      {
        key: "reason",
        label: "Reason",
        type: "select",
        required: true,
        options: ["duplicate_charge", "fraud", "product_issue", "goodwill", "other"],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["requested", "approved", "rejected", "paid"],
        readOnly: true,
      },
      {
        key: "payment_ref",
        label: "Payment ref",
        type: "text",
        hideInList: true,
        editableBy: ["finance", "admin"],
        help: "Set by finance once the payout has gone through.",
      },
      { key: "notes", label: "Notes", type: "textarea", hideInList: true },
    ],
    permissions: {
      read: EVERYONE,
      create: ["support", "admin"],
      update: ["support", "finance", "admin"],
      delete: ["admin"],
    },
    workflow: {
      field: "status",
      transitions: [
        {
          from: "requested",
          to: "approved",
          label: "Approve",
          roles: ["support", "finance", "admin"],
          style: "primary",
          escalate: {
            when: { field: "amount", gt: 1000 },
            roles: ["finance", "admin"],
            message: "Refunds over 1,000 need finance or an admin to approve.",
          },
        },
        { from: "requested", to: "rejected", label: "Reject", roles: ["support", "finance", "admin"], requireNote: true, style: "danger" },
        { from: "approved", to: "paid", label: "Mark paid", roles: ["finance", "admin"], style: "primary" },
        { from: "approved", to: "requested", label: "Send back", roles: ["finance", "admin"], requireNote: true },
      ],
    },
    statusColors: {
      requested: "bg-gray-100 text-gray-700",
      approved: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      paid: "bg-green-100 text-green-800",
    },
  },
  {
    slug: "flags",
    name: "Feature Flag Admin",
    description:
      "Engineers toggle flags per environment. Every change needs a reason and is audited.",
    table: "feature_flags",
    titleField: "key",
    defaultSort: { field: "key", dir: "asc" },
    fields: [
      { key: "key", label: "Flag key", type: "text", required: true, searchable: true, help: "lowercase, dot-separated, e.g. payments.instant_refunds" },
      { key: "description", label: "Description", type: "textarea", hideInList: true, searchable: true },
      {
        key: "environment",
        label: "Environment",
        type: "select",
        required: true,
        options: ["development", "staging", "production"],
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      { key: "rollout_percent", label: "Rollout %", type: "number", min: 0, max: 100, required: true },
      {
        key: "owner_team",
        label: "Owner",
        type: "select",
        required: true,
        options: ["payments", "onboarding", "risk", "platform", "growth"],
      },
      {
        key: "change_reason",
        label: "Change reason",
        type: "text",
        required: true,
        hideInList: true,
        help: "Why are you changing this flag? It is written to the audit log.",
      },
    ],
    permissions: {
      read: EVERYONE,
      create: ["engineer", "admin"],
      update: ["engineer", "admin"],
      delete: ["admin"],
    },
    statusColors: {
      production: "bg-red-100 text-red-800",
      staging: "bg-amber-100 text-amber-800",
      development: "bg-gray-100 text-gray-700",
    },
  },
];

export function getApp(slug: string): AppDefinition | undefined {
  return APPS.find((a) => a.slug === slug);
}

export function getField(app: AppDefinition, key: string): Field | undefined {
  return app.fields.find((f) => f.key === key);
}

export function evaluateCondition(c: Condition, record: Record<string, unknown>): boolean {
  const v = record[c.field];
  if (c.eq !== undefined) return v === c.eq;
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return false;
  if (c.gt !== undefined && !(n > c.gt)) return false;
  if (c.gte !== undefined && !(n >= c.gte)) return false;
  if (c.lt !== undefined && !(n < c.lt)) return false;
  if (c.lte !== undefined && !(n <= c.lte)) return false;
  return true;
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ");
}
