"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, canEditField, SESSION_COOKIE, USERS } from "./auth";
import { getApp } from "./schema";
import {
  coerce,
  createRecord,
  deleteRecord,
  ForbiddenError,
  transitionRecord,
  updateRecord,
  validate,
  type FieldErrors,
} from "./records";

export type FormState = { errors?: FieldErrors; message?: string } | null;

export async function loginAs(formData: FormData) {
  const id = String(formData.get("user") ?? "");
  if (!USERS.some((u) => u.id === id)) return;
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

/**
 * Create or update a record. Bound with (slug, id) from the form component.
 * Returns field errors to the form, or redirects to the record on success.
 */
export async function saveRecord(
  slug: string,
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const app = getApp(slug);
  if (!app) return { message: "Unknown app" };
  const user = await getCurrentUser();

  const editable = app.fields.filter((f) => canEditField(user, app, f));
  const values: Record<string, unknown> = {};
  for (const f of editable) values[f.key] = coerce(f, formData.get(f.key));

  const errors = validate(app, editable, values);
  if (Object.keys(errors).length) return { errors, message: "Please fix the highlighted fields." };

  let recordId = id;
  try {
    if (id === null) recordId = createRecord(app, user, values);
    else updateRecord(app, user, id, values);
  } catch (e) {
    if (e instanceof ForbiddenError) return { message: e.message };
    throw e;
  }

  revalidatePath(`/apps/${slug}`);
  redirect(`/apps/${slug}/${recordId}?saved=1`);
}

export async function removeRecord(slug: string, id: number) {
  const app = getApp(slug);
  if (!app) return;
  const user = await getCurrentUser();
  try {
    deleteRecord(app, user, id);
  } catch (e) {
    if (e instanceof ForbiddenError) redirect(`/apps/${slug}/${id}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(`/apps/${slug}`);
  redirect(`/apps/${slug}`);
}

export async function applyTransition(slug: string, id: number, to: string, formData: FormData) {
  const app = getApp(slug);
  if (!app) return;
  const user = await getCurrentUser();
  const note = formData.get("note");
  try {
    transitionRecord(app, user, id, to, typeof note === "string" ? note : null);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong";
    redirect(`/apps/${slug}/${id}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/apps/${slug}`);
  redirect(`/apps/${slug}/${id}?saved=1`);
}
