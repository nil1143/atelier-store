import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { closeUnpaidSession, fulfillCheckoutSession } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

/**
 * The authoritative fulfilment trigger. The buyer's return page fulfils too,
 * but only this path is guaranteed to run — someone can pay and then lose
 * their connection before any page of ours loads.
 *
 * This endpoint is authenticated by Stripe's signature alone. It must stay
 * outside `src/proxy.ts`'s matcher and must not require a session.
 *
 * The body is read with `text()` and never parsed: signature verification
 * needs the exact bytes Stripe signed. Route handlers are already dynamic and
 * already run on Node, and `cacheComponents` rejects stating either.
 */
export async function POST(request: Request): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    // Unsigned or tampered: nothing is read, nothing is written. The reason is
    // logged because a misconfigured signing secret and a genuine forgery look
    // identical from the outside, and only one of them is an emergency.
    console.error(
      "[stripe] signature verification failed:",
      error instanceof Error ? error.message : error,
    );
    return new Response("Invalid signature", { status: 400 });
  }

  // Already handled. Cheap skip for Stripe's retries — but *not* the guard
  // that makes fulfilment exactly-once: the return page never touches this
  // table, so that job belongs to the guarded status flip in the order layer.
  const seen = await db.$count(stripeEvents, eq(stripeEvents.id, event.id));
  if (seen > 0) return new Response(null, { status: 200 });

  try {
    await handleEvent(event);
  } catch (error) {
    // 500 so Stripe retries. The event is recorded only after the work
    // succeeds, so a retry does the work rather than skipping it as done.
    console.error(`[stripe] ${event.type} ${event.id} failed`, error);
    return new Response("Handler error", { status: 500 });
  }

  await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing();

  return new Response(null, { status: 200 });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    /**
     * Both of these fulfil, and both go through the same gate.
     *
     * `completed` fires as soon as the buyer finishes the form — with a
     * delayed-notification method the session is still `unpaid` at that point,
     * and `fulfillCheckoutSession` does nothing until the money is real.
     * `async_payment_succeeded` is what arrives when it becomes real.
     */
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await fulfillCheckoutSession(event.data.object.id);
      return;

    /** A delayed payment failed. Nothing was decremented, so nothing reverses. */
    case "checkout.session.async_payment_failed":
      await closeUnpaidSession(event.data.object.id, "payment_failed");
      return;

    /** Abandoned, or past `expires_at`. No stock was held. */
    case "checkout.session.expired":
      await closeUnpaidSession(event.data.object.id, "expired");
      return;

    default:
      return;
  }
}
