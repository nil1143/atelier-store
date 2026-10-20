import { Pool, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * The default handle, over Neon's HTTP driver: one round trip per statement,
 * no connection to hold open. Every read and every single-statement write
 * uses this.
 */
export const db = drizzle({ client: neon(env.DATABASE_URL), schema });

/**
 * A second handle over Neon's WebSocket driver, which is the one that supports
 * transactions — `db` above cannot open one, which is also why `db:seed`
 * upserts instead.
 *
 * Reserved for the few writes that must be atomic across statements: creating
 * an order with its items, and the fulfilment path's guarded status flip plus
 * stock decrement. Prefer `db` everywhere else; this one holds a socket.
 *
 * Node 18+ ships a global `WebSocket`, so the driver needs no `ws` shim here.
 */
export const dbTx = drizzleWs({
  client: new Pool({ connectionString: env.DATABASE_URL }),
  schema,
});
