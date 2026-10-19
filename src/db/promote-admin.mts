import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

// Imported dynamically, after dotenv has run — see seed.mts.
const { db } = await import("./index");
const { user } = await import("./schema");
const { eq } = await import("drizzle-orm");

// Roles are never settable through the auth API (`input: false` in
// src/lib/auth.ts); this script is the only way to grant admin.
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run auth:promote -- <email>");
  process.exit(1);
}

const updated = await db
  .update(user)
  .set({ role: "admin" })
  .where(eq(user.email, email))
  .returning({ id: user.id });

if (updated.length === 0) {
  console.error(`No user with email ${email}.`);
  process.exit(1);
}
console.log(`${email} is now an admin.`);
