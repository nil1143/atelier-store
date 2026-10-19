"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "./actions";

const modes = {
  "sign-in": {
    action: signIn,
    submit: "Sign in",
    pending: "Signing in…",
    passwordAutocomplete: "current-password",
    switchPrompt: "New to Atelier?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    action: signUp,
    submit: "Create account",
    pending: "Creating account…",
    passwordAutocomplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} as const;

const inputClass = "border-field w-full px-3 py-2.5 text-sm";

export function AuthForm({
  mode,
  next,
}: {
  mode: keyof typeof modes;
  next: string | null;
}) {
  const m = modes[mode];
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(
    m.action,
    { error: null },
  );
  // Carry the return path across to the other form.
  const switchHref = next
    ? `${m.switchHref}?next=${encodeURIComponent(next)}`
    : m.switchHref;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {mode === "sign-up" && (
        <label className="flex flex-col gap-2">
          <span className="text-label">Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            defaultValue={state.name}
            className={inputClass}
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-label">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.email}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label">Password</span>
        <input
          name="password"
          type="password"
          autoComplete={m.passwordAutocomplete}
          required
          minLength={mode === "sign-up" ? 8 : undefined}
          aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
          className={inputClass}
        />
        {mode === "sign-up" && (
          <span id="password-hint" className="text-caption">
            At least 8 characters.
          </span>
        )}
      </label>

      <p role="alert" className="min-h-[1.65em] text-sm">
        {state.error}
      </p>

      <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
        {isPending ? m.pending : m.submit}
      </button>

      <p className="text-caption text-center">
        {m.switchPrompt}{" "}
        <Link href={switchHref} className="link-inline text-foreground">
          {m.switchLabel}
        </Link>
      </p>
    </form>
  );
}
