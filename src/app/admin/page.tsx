import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPrice } from "@/lib/catalog";
import { listOrders, orderStatusLabels } from "@/lib/orders";
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
  // Keyed on who is asking, so there is no static shell to prerender. Stating
  // it avoids the clock Better Auth reads tripping the prerender pass.
  await connection();

  const user = await requireAdmin("/admin");
  // Deliberately after the check, not in parallel with it — a non-admin must
  // not cause a read of every customer's orders.
  const orders = await listOrders();

  return (
    <>
      <h1 className="text-heading">Admin</h1>
      <p className="mt-4 text-muted">Signed in as {user.email}.</p>

      <h2 className="text-label text-muted mt-12">Orders</h2>
      {orders.length === 0 ? (
        <p className="mt-4 border-t border-line pt-6 text-muted">
          No orders yet.
        </p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <p className="text-product">{order.email}</p>
                <p className="tabular-nums">{formatPrice(order.totalCents)}</p>
              </div>
              <p className="text-caption">
                {order.createdAt.toLocaleString("en-GB")} ·{" "}
                {orderStatusLabels[order.status]}
                {/* The one state that needs a human: paid, but stock had gone. */}
                {order.oversold && (
                  <span className="text-accent"> · oversold</span>
                )}
              </p>
              <p className="text-caption">
                {order.items
                  .map((i) => `${i.name} ×${i.quantity}`)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
