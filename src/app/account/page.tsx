import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { formatPrice } from "@/lib/catalog";
import { listOrders, orderStatusLabels } from "@/lib/orders";
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
      <OrderHistory userId={user.id} />

      <form action={signOut} className="mt-10">
        <button type="submit" className="btn btn-secondary">
          Sign out
        </button>
      </form>
    </>
  );
}

/**
 * The customer's own orders. Scoped by the id `requireUser` returned, never by
 * anything from the request, so one customer cannot read another's.
 */
async function OrderHistory({ userId }: { userId: string }) {
  const orders = await listOrders({ userId });

  return (
    <>
      <h2 className="text-label text-muted mt-12">Orders</h2>
      {orders.length === 0 ? (
        <p className="mt-4 border-t border-line pt-6 text-muted">
          You have not placed an order yet.
        </p>
      ) : (
        <ul className="mt-4 border-t border-line">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-line py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <p className="text-product">
                  {order.status === "paid" ? (
                    <Link
                      href={`/checkout/complete?order=${order.id}`}
                      className="link-nav"
                    >
                      {order.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </Link>
                  ) : (
                    order.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  )}
                </p>
                <p className="tabular-nums">{formatPrice(order.totalCents)}</p>
              </div>
              <p className="text-caption">
                {orderStatusLabels[order.status]} ·{" "}
                {order.items.reduce((sum, i) => sum + i.quantity, 0)} items ·{" "}
                {order.items.map((i) => i.name).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
