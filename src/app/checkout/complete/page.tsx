import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatPrice } from "@/lib/catalog";
import { getOrderWithItems, type OrderWithItems } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order confirmed — Atelier",
  robots: { index: false },
};

export default function CheckoutCompletePage({
  searchParams,
}: PageProps<"/checkout/complete">) {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <div className="mx-auto max-w-xl">
        <Suspense fallback={<div className="min-h-[20rem]" />}>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Reads the order from our own database, never from the payment session.
 * Fulfilment already happened in the Route Handler that redirected here, so
 * this page only reports — it decides nothing about payment.
 */
async function Confirmation({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/complete">["searchParams"];
}) {
  // Nothing on this page can be prerendered: it is keyed on a query param and
  // on the signed-in user. Saying so explicitly keeps Next from attempting a
  // static pass, which otherwise trips over the clock Better Auth reads to
  // check session expiry (`blocking-prerender-current-time`).
  await connection();

  const user = await requireUser("/account");
  const { order: orderId } = await searchParams;

  if (typeof orderId !== "string") notFound();

  const order = await getOrderWithItems(orderId);
  // A 404 rather than a 403 for someone else's order, so the id itself tells
  // an attacker nothing about whether it exists.
  if (!order || order.userId !== user.id) notFound();

  return order.status === "paid" ? (
    <Paid order={order} />
  ) : (
    <Pending order={order} />
  );
}

function Paid({ order }: { order: OrderWithItems }) {
  return (
    <>
      <h1 className="text-heading">Thank you</h1>
      <p className="mt-4 text-muted">
        Your order is confirmed. A receipt is on its way to {order.email}.
      </p>
      <OrderSummary order={order} />
      {order.oversold && (
        <p role="status" className="text-caption text-accent mt-6">
          One piece in this order sold out as you paid. We will contact you
          about it before anything ships.
        </p>
      )}
      <Link href="/collections" className="btn btn-secondary mt-8">
        Continue shopping
      </Link>
    </>
  );
}

/**
 * The session completed but the money is not confirmed — a bank transfer or
 * another delayed method. Nothing is reserved and nothing has shipped; the
 * webhook will settle it either way.
 */
function Pending({ order }: { order: OrderWithItems }) {
  return (
    <>
      <h1 className="text-heading">Payment processing</h1>
      <p className="mt-4 text-muted">
        Your payment has not cleared yet. We will email {order.email} as soon as
        it does — there is nothing further for you to do.
      </p>
      <OrderSummary order={order} />
      <Link href="/collections" className="btn btn-secondary mt-8">
        Continue shopping
      </Link>
    </>
  );
}

function OrderSummary({ order }: { order: OrderWithItems }) {
  return (
    <>
      <h2 className="text-label text-muted mt-10">Order</h2>
      <ul className="mt-4 border-t border-line">
        {order.items.map((item) => (
          <li
            key={item.id}
            className="flex items-baseline justify-between gap-6 border-b border-line py-4"
          >
            <div className="min-w-0">
              <p className="text-product">
                <Link href={`/products/${item.slug}`} className="link-nav">
                  {item.name}
                </Link>
              </p>
              <p className="text-caption tabular-nums">
                {formatPrice(item.unitPriceCents)} × {item.quantity}
              </p>
            </div>
            <p className="tabular-nums">
              {formatPrice(item.unitPriceCents * item.quantity)}
            </p>
          </li>
        ))}
        <li className="flex items-baseline justify-between gap-6 py-4">
          <span className="text-label text-muted">Total</span>
          <span className="tabular-nums">{formatPrice(order.totalCents)}</span>
        </li>
      </ul>
    </>
  );
}
