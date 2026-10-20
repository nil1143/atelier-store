import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { db, dbTx } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { CATALOG_TAG } from "@/lib/catalog";
import { getStripe } from "@/lib/stripe";

/**
 * The money path. Everything here reads the catalogue **uncached**, which is
 * the whole reason this module exists separately from `@/lib/catalog`: every
 * query there opens with `"use cache"` + `cacheLife("minutes")`, and a price
 * that is minutes stale is a wrong amount charged, not a stale badge.
 *
 * The storefront keeps using the cached reads — a bag that shows last minute's
 * stock is fine, because nothing is committed until a quote is taken here.
 */

/** The currency every order is priced in. Matches `formatPrice`'s locale. */
export const CHECKOUT_CURRENCY = "eur";

/** What the bag cookie asked for, with the cookie's own format left behind. */
export type RequestedLine = { slug: string; quantity: number };

export type CheckoutLine = {
  productId: number;
  slug: string;
  name: string;
  /** From the catalogue, read just now. Never from the client. */
  unitPriceCents: number;
  /** Granted quantity: what was asked for, capped at stock on hand. */
  quantity: number;
  requested: number;
  /** Primary image, for the payment session's line item. */
  image: string;
};

export type CheckoutQuote = {
  lines: CheckoutLine[];
  totalCents: number;
  /**
   * A line was reduced or dropped between rendering the bag and quoting it.
   * The buyer has to see the new total before anything charges them, so a
   * caller must re-render rather than proceed.
   */
  adjusted: boolean;
};

/**
 * Prices and stock as of right now. Deliberately not cached and deliberately
 * not in `@/lib/catalog` — see the module comment.
 */
async function readForCheckout(slugs: string[]) {
  if (slugs.length === 0) return [];

  return db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      quantity: products.quantity,
      images: products.images,
    })
    .from(products)
    .where(inArray(products.slug, slugs));
}

/**
 * Turns a bag into the exact lines and total an order will be created with.
 *
 * This is the authoritative stock gate: the clamps in the cart actions are a
 * shop-front courtesy against cached numbers, whereas this read is live and
 * its result is what gets charged. A line is dropped when the product has
 * been delisted or has sold out, and reduced when stock no longer covers it;
 * either sets `adjusted`.
 */
export async function quoteCart(
  requested: readonly RequestedLine[],
): Promise<CheckoutQuote> {
  const rows = await readForCheckout(requested.map((line) => line.slug));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  const lines: CheckoutLine[] = [];
  let adjusted = false;

  for (const { slug, quantity } of requested) {
    const row = bySlug.get(slug);
    if (!row || row.quantity === 0) {
      adjusted = true;
      continue;
    }

    const granted = Math.min(quantity, row.quantity);
    if (granted !== quantity) adjusted = true;

    lines.push({
      productId: row.id,
      slug: row.slug,
      name: row.name,
      unitPriceCents: row.priceCents,
      quantity: granted,
      requested: quantity,
      // `products_images_not_empty` guarantees this index exists.
      image: row.images[0],
    });
  }

  return {
    lines,
    totalCents: lines.reduce(
      (sum, line) => sum + line.unitPriceCents * line.quantity,
      0,
    ),
    adjusted,
  };
}

/**
 * Writes a `pending` order and its lines from an already-taken quote, and
 * returns the id to hand the payment provider as the session's client
 * reference.
 *
 * The order is created *before* the payment session so that fulfilment can
 * always resolve one — a session whose id we failed to store still carries
 * this id — and so the id can key the provider request against double
 * submits. The cost is a `pending` row with no payment when session creation
 * fails, which expiry sweeps up; nothing is reserved, so it holds no stock.
 *
 * Transactional (hence `dbTx`): an order row whose items failed to insert
 * would be an order with a total and nothing in it.
 */
export async function createPendingOrder(input: {
  userId: string;
  email: string;
  quote: CheckoutQuote;
}): Promise<{ id: string }> {
  const { userId, email, quote } = input;

  // Both are guarded by check constraints; failing here names the real cause.
  if (quote.lines.length === 0) {
    throw new Error("Cannot create an order with no lines");
  }
  if (quote.totalCents <= 0) {
    throw new Error("Cannot create an order with a non-positive total");
  }

  return dbTx.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        userId,
        email,
        currency: CHECKOUT_CURRENCY,
        totalCents: quote.totalCents,
      })
      .returning({ id: orders.id });

    if (!order) throw new Error("Order insert returned no row");

    await tx.insert(orderItems).values(
      quote.lines.map((line) => ({
        orderId: order.id,
        productId: line.productId,
        slug: line.slug,
        name: line.name,
        unitPriceCents: line.unitPriceCents,
        quantity: line.quantity,
      })),
    );

    return order;
  });
}

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/** An order with its lines, for the confirmation page. */
export type OrderWithItems = Order & { items: OrderItem[] };

export async function getOrderWithItems(
  orderId: string,
): Promise<OrderWithItems | undefined> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return undefined;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return { ...order, items };
}

/** Records the payment session an order was sent to. */
export async function attachSession(
  orderId: string,
  sessionId: string,
): Promise<void> {
  await db
    .update(orders)
    .set({ stripeSessionId: sessionId })
    .where(eq(orders.id, orderId));
}

const paymentIntentId = (session: Stripe.Checkout.Session): string | null =>
  typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? null);

/**
 * Resolves the order a payment session belongs to, refusing any session that
 * does not line up with it.
 *
 * `client_reference_id` is the id we put there ourselves when the session was
 * created, and the order's own `stripeSessionId` has to agree once it is set —
 * so a session cannot be made to fulfil an order it does not belong to.
 */
async function orderForSession(
  session: Stripe.Checkout.Session,
): Promise<Order | null> {
  const orderId = session.client_reference_id;
  if (!orderId) return null;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  if (order.stripeSessionId !== null && order.stripeSessionId !== session.id) {
    return null;
  }

  return order;
}

/**
 * The fulfilment path, and the only place an order becomes `paid` or stock is
 * decremented. Safe to call any number of times, concurrently, for the same
 * session — which it has to be, because both the webhook and the buyer's
 * return page call it.
 *
 * Payment status is read from Stripe's API, never from a query parameter or
 * anything else the buyer's browser carries.
 *
 * Returns the order as it now stands, or null when the session names no order
 * we recognise.
 */
export async function fulfillCheckoutSession(
  sessionId: string,
): Promise<Order | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  const order = await orderForSession(session);
  if (!order) return null;

  // With a delayed-notification method the session completes while still
  // unpaid; `async_payment_succeeded` arrives later. Fulfilling now would
  // hand over goods for a payment that can still fail.
  if (session.payment_status === "unpaid") return order;

  // The amount we computed from the catalogue, against what Stripe actually
  // charged. A mismatch means this is not the session we built, so it stays
  // pending for a human rather than fulfilling on an unverified total.
  if (
    session.amount_total !== order.totalCents ||
    session.currency !== order.currency
  ) {
    console.error(
      `[checkout] amount mismatch on order ${order.id}: session ` +
        `${session.amount_total} ${session.currency} vs order ` +
        `${order.totalCents} ${order.currency} — not fulfilling`,
    );
    return order;
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  /**
   * One transaction, and the reason `dbTx` exists. The guarded status flip is
   * what makes this exactly-once: concurrent callers race on
   * `WHERE status = 'pending'` and only one gets a row back. The decrements
   * must commit with that flip — split apart, a crash between them would
   * leave an order marked paid whose stock was never taken, and the retry
   * would see `paid` and skip it.
   */
  const fulfilled = await dbTx.transaction(async (tx) => {
    const [claimed] = await tx
      .update(orders)
      .set({
        status: "paid",
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId(session),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });

    // Already fulfilled — by the webhook, the return page, or a retry.
    if (!claimed) return false;

    let oversold = false;
    for (const item of items) {
      const [decremented] = await tx
        .update(products)
        .set({ quantity: sql`${products.quantity} - ${item.quantity}` })
        .where(
          and(
            eq(products.id, item.productId),
            gte(products.quantity, item.quantity),
          ),
        )
        .returning({ id: products.id });

      // The guard held the stock floor at zero, so the piece sold out between
      // the session being created and paid. We have the money: recording the
      // order and flagging it beats refusing a captured payment.
      if (!decremented) oversold = true;
    }

    if (oversold) {
      await tx
        .update(orders)
        .set({ oversold: true })
        .where(eq(orders.id, order.id));
    }

    return true;
  });

  // Stock just moved, so the cached catalogue is wrong about it. Only on the
  // call that actually claimed the order: the duplicate callers changed
  // nothing and have nothing to invalidate.
  // `{ expire: 0 }` rather than a profile: the second argument is how long
  // stale content may still be served while revalidation runs, and a named
  // profile would let the first visitor after a sale see the old badge. Zero
  // makes that request a blocking refresh, so the piece reads "Sold out" the
  // moment it sells — the same reason these queries use `cacheLife("minutes")`
  // instead of the default.
  if (fulfilled) revalidateTag(CATALOG_TAG, { expire: 0 });

  const [updated] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id));

  return updated ?? order;
}

/**
 * Moves an order out of `pending` after a failed or expired session.
 *
 * Guarded on `pending`, so a webhook that arrives late or out of order can
 * never pull a paid order back — and nothing has to be reversed, because
 * stock is only ever taken by `fulfillCheckoutSession`.
 */
export async function closeUnpaidSession(
  sessionId: string,
  status: "payment_failed" | "expired",
): Promise<void> {
  await db
    .update(orders)
    .set({ status })
    .where(
      and(eq(orders.stripeSessionId, sessionId), eq(orders.status, "pending")),
    );
}

/**
 * Orders newest first, with their lines. One query for the orders and one for
 * all their items, rather than a per-order round trip.
 *
 * `userId` scopes it to one customer for `/account`; omitting it is the admin
 * view. The caller is responsible for having established who is asking —
 * `requireUser` or `requireAdmin` — and that check is never implied here.
 */
export async function listOrders(options: {
  userId?: string;
  limit?: number;
} = {}): Promise<OrderWithItems[]> {
  const { userId, limit = 50 } = options;

  const rows = await db
    .select()
    .from(orders)
    .where(userId ? eq(orders.userId, userId) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  if (rows.length === 0) return [];

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((o) => o.id),
      ),
    );

  const byOrder = new Map<string, OrderItem[]>();
  for (const item of items) {
    const list = byOrder.get(item.orderId);
    if (list) list.push(item);
    else byOrder.set(item.orderId, [item]);
  }

  return rows.map((order) => ({ ...order, items: byOrder.get(order.id) ?? [] }));
}

/** How an order's state reads to a customer. */
export const orderStatusLabels: Record<Order["status"], string> = {
  pending: "Awaiting payment",
  paid: "Confirmed",
  payment_failed: "Payment failed",
  expired: "Expired",
};
