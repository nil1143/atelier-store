import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your account — Atelier",
};

export default function AccountPage() {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="mx-auto max-w-xl">
        <h1 className="text-heading">Your account</h1>
        <Suspense fallback={<div className="mt-8 min-h-[12rem] md:mt-10" />}>
          <AccountDetails />
        </Suspense>
      </div>
    </div>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account");
  return (
    <>
      <dl className="mt-8 border-t border-line md:mt-10">
        <div className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:gap-6">
          <dt className="text-label text-muted sm:w-32">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:gap-6">
          <dt className="text-label text-muted sm:w-32">Email</dt>
          <dd className="break-all">{user.email}</dd>
        </div>
      </dl>
      <form action={signOut} className="mt-8">
        <button type="submit" className="btn btn-secondary">
          Sign out
        </button>
      </form>
    </>
  );
}
