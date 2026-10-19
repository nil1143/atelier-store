"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeReturnPath } from "@/lib/session";

/**
 * React resets a form after its action runs, so the fields the user typed are
 * echoed back and used as defaults. The password never is.
 */
export type AuthFormState = { error: string | null; name?: string; email?: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email");
  // Passwords are compared exactly as typed, so this one is not trimmed.
  const password = formData.get("password");
  if (!email || typeof password !== "string" || !password) {
    return { error: "Enter your email and password.", email };
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      // One message for every failure, so it can't confirm an account exists.
      return { error: "That email and password don't match.", email };
    }
    throw error;
  }

  redirect(safeReturnPath(formData.get("next")) ?? "/account");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = formData.get("password");
  if (!name || !email || typeof password !== "string" || !password) {
    return { error: "Fill in your name, email and password.", name, email };
  }

  try {
    // autoSignIn is on, so this also creates the session.
    await auth.api.signUpEmail({
      body: { name, email, password },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        error: error.message || "We couldn't create your account.",
        name,
        email,
      };
    }
    throw error;
  }

  redirect(safeReturnPath(formData.get("next")) ?? "/account");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
