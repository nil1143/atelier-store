function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get BETTER_AUTH_SECRET() {
    return required("BETTER_AUTH_SECRET");
  },
  get BETTER_AUTH_URL() {
    return required("BETTER_AUTH_URL");
  },
  /**
   * Prefer a restricted key (`rk_`) scoped to writing Checkout Sessions and
   * reading PaymentIntents — nothing here needs a full secret key.
   */
  get STRIPE_SECRET_KEY() {
    return required("STRIPE_SECRET_KEY");
  },
  get STRIPE_WEBHOOK_SECRET() {
    return required("STRIPE_WEBHOOK_SECRET");
  },
  /**
   * The storefront's own origin, used to build the payment session's return
   * URLs. Deliberately not derived from the request's `Host` header: a forged
   * host would otherwise aim a buyer's return URL at someone else's domain.
   */
  get APP_URL() {
    return required("APP_URL");
  },
};
