"use server";

import { redirect } from "next/navigation";
import { readRequestedLines, writeStoredCart } from "@/lib/cart";
import { env } from "@/lib/env";
import {
  CHECKOUT_CURRENCY,
  attachSession,
  createPendingOrder,
  quoteCart,
} from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

/** Stripe requires at least 30 minutes; the margin absorbs clock skew. */
const SESSION_LIFETIME_SECONDS = 35 * 60;

/**
 * Labels this flow in Stripe's Dashboard so checkout surfaces can be compared.
 * The random suffix is fixed, not generated per session — it identifies the
 * integration, not the request.
 */
const INTEGRATION_IDENTIFIER = "atelier-web-qkzrvhdm";

/**
 * Takes the bag to Stripe Checkout.
 *
 * Order of operations matters here. The quote is taken against live stock and
 * live prices, the order is written before the payment session exists, and
 * only then is the buyer sent to Stripe:
 *
 *  - the order id is what the session carries as its client reference, so
 *    fulfilment can always find the order even if storing the session id below
 *    never happened;
 *  - the amounts stored on the order are the ones sent as line items, which is
 *    what lets fulfilment refuse a session whose total disagrees.
 *
 * The bag is deliberately **not** cleared here. Abandoning checkout has to
 * leave the bag intact; it is cleared on return, once payment is confirmed.
 */
export async function startCheckout(): Promise<void> {
  const user = await requireUser("/cart");

  const requested = await readRequestedLines();
  if (requested.length === 0) redirect("/cart");

  const quote = await quoteCart(requested);

  /**
   * Live stock no longer matches what the bag was showing. Write the quoted
   * quantities back so the page agrees with what is actually available, and
   * send the buyer back to approve the new total — never charge a basket the
   * buyer has not seen.
   *
   * Writing the cookie is also what keeps this from looping: the cart renders
   * from cached stock, so without it the same press would be adjusted again.
   */
  if (quote.adjusted) {
    await writeStoredCart(
      quote.lines.map((line) => ({ s: line.slug, q: line.quantity })),
    );
    redirect("/cart?checkout=adjusted");
  }

  const order = await createPendingOrder({
    userId: user.id,
    email: user.email,
    quote,
  });

  const session = await getStripe().checkout.sessions.create(
    {
      mode: "payment",
      // No `payment_method_types`: that would opt out of dynamic payment
      // methods, which pick what to show from the buyer's country and device.
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      customer_email: user.email,
      line_items: quote.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: CHECKOUT_CURRENCY,
          // Priced inline from our own catalogue rather than from a synced
          // Stripe Price, so there is one source of truth and nothing to drift.
          unit_amount: line.unitPriceCents,
          product_data: {
            name: line.name,
            images: [line.image],
            metadata: { slug: line.slug },
          },
        },
      })),
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      // A Route Handler, not the confirmation page: the bag lives in a cookie,
      // and Next only permits cookie writes in Route Handlers and Actions.
      success_url: `${env.APP_URL}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_URL}/cart`,
      integration_identifier: INTEGRATION_IDENTIFIER,
    },
    // Scoped to this order, so a retried request reuses the same session
    // rather than opening a second one against the same order.
    { idempotencyKey: `checkout:${order.id}` },
  );

  await attachSession(order.id, session.id);

  if (!session.url) {
    throw new Error(`Checkout session ${session.id} has no URL`);
  }

  redirect(session.url);
}
