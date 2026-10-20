import { NextResponse } from "next/server";
import { CART_COOKIE } from "@/lib/cart";
import { env } from "@/lib/env";
import { fulfillCheckoutSession } from "@/lib/orders";

/**
 * Where Stripe sends the buyer after a completed session.
 *
 * It exists as a Route Handler rather than a page for one concrete reason:
 * the bag is a cookie, and Next only allows cookie writes from a Route Handler
 * or a Server Action. Emptying the bag is the one thing the webhook cannot do,
 * having no browser to write to.
 *
 * Fulfilling here as well as in the webhook is an optimisation, not the
 * mechanism — it means a buyer who is still watching sees a confirmed order
 * instead of waiting on webhook delivery. It is the same idempotent call, so
 * whichever arrives first wins and the other is a no-op.
 */
export async function GET(request: Request): Promise<Response> {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.redirect(new URL("/cart", env.APP_URL));
  }

  const order = await fulfillCheckoutSession(sessionId);

  // No order answers to this session — a stale or invented link.
  if (!order) {
    return NextResponse.redirect(new URL("/cart", env.APP_URL));
  }

  const destination = new URL("/checkout/complete", env.APP_URL);
  destination.searchParams.set("order", order.id);
  const response = NextResponse.redirect(destination);

  // Only once the money is confirmed. An abandoned or failed checkout has to
  // leave the bag exactly as the buyer left it.
  if (order.status === "paid") {
    response.cookies.delete(CART_COOKIE);
  }

  return response;
}
