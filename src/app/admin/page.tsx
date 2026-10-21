import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: "Admin — Atelier",
  robots: { index: false },
};

const sections = [
  {
    href: "/admin/products",
    label: "Products",
    blurb: "Every piece, its price and the stock on hand. Edit stock in place.",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    blurb: "Departments and product types, and the homepage tile art.",
  },
  {
    href: "/admin/orders",
    label: "Orders",
    blurb: "Every order, newest first, with anything that oversold flagged.",
  },
];

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
  // Keyed on who is asking, so there is no static shell to prerender. Stating
  // it avoids the clock Better Auth reads tripping the prerender pass.
  await connection();

  const user = await requireAdmin("/admin");

  return (
    <>
      <h1 className="text-heading">Admin</h1>
      <p className="mt-4 text-muted">Signed in as {user.email}.</p>

      <AdminNav />

      <ul className="mt-8">
        {sections.map((s) => (
          <li key={s.href} className="border-b border-line py-5">
            <Link href={s.href} className="link-inline text-product">
              {s.label}
            </Link>
            <p className="text-caption mt-1">{s.blurb}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
