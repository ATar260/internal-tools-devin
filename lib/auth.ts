import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  evaluateCondition,
  type Action,
  type AppDefinition,
  type Field,
  type Role,
  type Transition,
} from "./schema";

/**
 * Demo identity. In the real system this is the one piece you would not
 * build: the session comes from the company IdP (Okta / Entra ID) via an
 * OIDC library, and `role` comes from a group claim. Everything downstream
 * (can, canEditField, transitionsFor) stays the same.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
}

export const USERS: User[] = [
  { id: "amara", name: "Amara Okafor", email: "amara@example.com", role: "admin", team: "Platform" },
  { id: "daniel", name: "Daniel Reyes", email: "daniel@example.com", role: "compliance", team: "Risk & Compliance" },
  { id: "priya", name: "Priya Nair", email: "priya@example.com", role: "support", team: "Customer Support" },
  { id: "tom", name: "Tom Whitfield", email: "tom@example.com", role: "finance", team: "Finance Ops" },
  { id: "lena", name: "Lena Fischer", email: "lena@example.com", role: "engineer", team: "Payments Engineering" },
  { id: "sam", name: "Sam Chen", email: "sam@example.com", role: "viewer", team: "Product" },
];

export const SESSION_COOKIE = "demo_user";

export async function getOptionalUser(): Promise<User | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  return USERS.find((u) => u.id === id) ?? null;
}

export async function getCurrentUser(): Promise<User> {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
}

export function can(user: User, app: AppDefinition, action: Action): boolean {
  return app.permissions[action].includes(user.role);
}

export function canEditField(user: User, app: AppDefinition, field: Field): boolean {
  if (field.readOnly) return false;
  if (!can(user, app, "update") && !can(user, app, "create")) return false;
  if (field.editableBy && !field.editableBy.includes(user.role)) return false;
  return true;
}

export interface TransitionOption {
  transition: Transition;
  allowed: boolean;
  /** Why the button is disabled, when it is. */
  reason?: string;
}

/**
 * Which workflow buttons to show for this user on this record, and whether
 * each is enabled. Business rules (escalate) are applied here so the UI and
 * the server action share one source of truth.
 */
export function transitionsFor(
  user: User,
  app: AppDefinition,
  record: Record<string, unknown>,
): TransitionOption[] {
  if (!app.workflow) return [];
  const current = record[app.workflow.field];
  return app.workflow.transitions
    .filter((t) => t.from === current)
    .map((t) => {
      let roles = t.roles;
      let reason: string | undefined;
      if (t.escalate && evaluateCondition(t.escalate.when, record)) {
        roles = t.escalate.roles;
        reason = t.escalate.message;
      }
      const allowed = roles.includes(user.role);
      return {
        transition: t,
        allowed,
        reason: allowed ? undefined : reason ?? `Needs one of: ${roles.join(", ")}.`,
      };
    });
}
