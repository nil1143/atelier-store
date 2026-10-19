import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin — Atelier",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <Suspense fallback={<div className="min-h-[8rem]" />}>
        <AdminHome />
      </Suspense>
    </div>
  );
}

// The heading sits inside the boundary too: a non-admin gets a 404, so nothing
// about this page should render before the check passes.
async function AdminHome() {
  const user = await requireAdmin("/admin");
  return (
    <>
      <h1 className="text-heading">Admin</h1>
      <p className="mt-4 text-muted">Signed in as {user.email}.</p>
    </>
  );
}
