import { Suspense } from "react";
import { safeReturnPath } from "@/lib/session";
import { AuthForm } from "./auth-form";

type Mode = "sign-in" | "sign-up";

/**
 * Shared shell for the sign-in and sign-up pages. The heading prerenders; the
 * form reads `?next=` from the request, so it streams in behind the boundary.
 */
export function AuthPage({
  mode,
  title,
  intro,
  searchParams,
}: {
  mode: Mode;
  title: string;
  intro: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="mx-auto max-w-sm">
        <h1 className="text-heading">{title}</h1>
        <p className="mt-4 mb-8 text-muted md:mb-10">{intro}</p>
        {/* Reserves the form's height so nothing shifts when it streams in. */}
        <Suspense fallback={<div className={mode === "sign-up" ? "min-h-[26rem]" : "min-h-[20rem]"} />}>
          <Form mode={mode} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Form({
  mode,
  searchParams,
}: {
  mode: Mode;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode={mode} next={safeReturnPath(next)} />;
}
