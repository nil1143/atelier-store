import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { env } from "@/lib/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  // Sessions use the defaults: stored in the database, 7-day expiry refreshed
  // daily, no cookie cache — so sign-out and role changes apply immediately.
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      // input: false keeps role out of sign-up and update-user bodies; it is
      // only ever changed server-side, by `npm run auth:promote`.
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },
  // nextCookies must stay last so Server Actions can set auth cookies.
  plugins: [nextCookies()],
});
