import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/**
 * The only place pages and actions read auth. Every call reads the request, so
 * under Cache Components a caller must sit inside a `<Suspense>` boundary.
 *
 * `cache` dedupes the session lookup within one request.
 */
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

/** Signed-in user, or a redirect to sign-in that returns to `returnTo`. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role ?? "customer" };
}

/**
 * Admin, or a 404 — not a 403, so the admin area's existence isn't confirmed.
 * Admin Server Actions and Route Handlers must call this themselves; a page's
 * check does not protect them.
 */
export async function requireAdmin(returnTo: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}

/**
 * A same-origin path to return to after sign-in, or null. Rejects absolute and
 * protocol-relative URLs (`//host`, `/\host`) so `?next=` can't be an open
 * redirect.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}
