import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

/**
 * The one Stripe client, built on first use.
 *
 * Lazy on purpose. `env` throws for a missing variable when it is *read*, so
 * constructing the client at module load would make the payment keys a
 * requirement for merely importing `@/lib/orders` — which the cart page and
 * every database-only order query do. Deferring it keeps the key required
 * only where Stripe is actually called.
 *
 * Instantiated rather than configured globally: the module-level API key
 * pattern is deprecated across Stripe's SDKs.
 *
 * `apiVersion` is deliberately unset so the SDK uses the version it was
 * generated against, which is the one its TypeScript types describe. Pinning
 * a different string would let the types and the wire format disagree.
 */
export function getStripe(): Stripe {
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}
