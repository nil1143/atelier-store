import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { env } from "@/lib/env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg" }),
  // Auth methods (email/password, social providers) are not configured yet.
  // nextCookies must stay last so Server Actions can set auth cookies.
  plugins: [nextCookies()],
});
