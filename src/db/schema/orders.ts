import { desc, relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";

/**
 * An order's whole lifecycle. `paid` is the only state that fulfils, and the
 * only one stock is decremented for.
 *
 * Transitions are always written guarded (`WHERE status = 'pending'`) so a
 * webhook replayed out of order cannot regress a paid order.
 */
export const orderStatus = pgEnum("order_status", [
  /** Created, buyer sent to the payment provider. Nothing reserved. */
  "pending",
  /** Funds confirmed by the provider's API. Stock has been decremented. */
  "paid",
  /** A delayed-notification method failed after the session completed. */
  "payment_failed",
  /** The session expired, or the buyer never came back. */
  "expired",
]);

export const orders = pgTable(
  "orders",
  {
    /**
     * Also the idempotency anchor for the whole flow: it is created before the
     * payment session exists, travels as that session's client reference, and
     * keys the provider request so a double-submit yields one session.
     */
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    /** Captured at creation: the account's address may change afterwards. */
    email: text("email").notNull(),

    /** Set immediately after the payment session is created. */
    stripeSessionId: text("stripe_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),

    currency: text("currency").notNull().default("eur"),
    /**
     * What *we* computed from the catalogue and sent as the session's line
     * items. Fulfilment refuses to mark an order paid unless the provider
     * reports this same total, which is what makes the amount untamperable.
     */
    totalCents: integer("total_cents").notNull(),

    /** Payment captured, but stock had run out. Needs a human. */
    oversold: boolean("oversold").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [
    index("orders_user_created_idx").on(t.userId, desc(t.createdAt)),
    check("orders_total_positive", sql`${t.totalCents} > 0`),
    // paidAt and status are two views of one fact; keep them from disagreeing.
    check(
      "orders_paid_at_matches_status",
      sql`(${t.status} = 'paid') = (${t.paidAt} IS NOT NULL)`,
    ),
  ],
);

/**
 * One line of an order, with name and price **snapshotted**. The catalogue is
 * live — `products.price_cents` will change — so an order that re-read it
 * would silently rewrite its own history. `productId` stays as a live link
 * because fulfilment decrements stock through it.
 */
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    // One line per product per order, which is also what makes the decrement
    // loop in fulfilment total: it visits each product exactly once.
    uniqueIndex("order_items_order_product_idx").on(t.orderId, t.productId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_positive", sql`${t.unitPriceCents} > 0`),
  ],
);

/**
 * Every provider event already processed, keyed by the provider's own event
 * id. The dedup ledger for the webhook, and an audit trail of what arrived.
 *
 * This is not the only duplicate guard — the guarded status transition in
 * fulfilment is what makes the stock decrement exactly-once, because the
 * success page fulfils too and never touches this table.
 */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));
