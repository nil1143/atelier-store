# Atelier Store

![homepage](public/readme-screens/1%20homepage1.png)

A luxury fashion storefront built with Next.js 16 - browsing, search, cart,
checkout and a staff back office on one codebase. Built with the App Router,
TypeScript and Tailwind CSS, with Better Auth, Drizzle ORM, Neon Postgres and
Stripe Checkout.

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout-635bff)](https://stripe.com/)

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Structure](#structure)
- [Screenshots](#screenshots)
- [Get Started](#get-started)
- [Scripts](#scripts)
- [Testing Stripe locally](#testing-stripe-locally)

## Features

### Storefront
- **Catalogue browsing**: homepage grids, department/type collections
  (`/collections/[slug]`), and product detail pages with an image gallery.
- **Search**: full-text product search (`/search`).
- **Cart & checkout**: server-persisted bag, Stripe Checkout Session for
  payment, a dedicated return route that empties the bag and shows order
  confirmation (`/checkout/complete`).
- **Accounts**: email/password auth via Better Auth, with an account page for
  signed-in buyers. Sign-in is required to check out.
- **Editorial pages**: campaign and atelier brand pages alongside the catalogue.

### Admin back office (`/admin`)
- Manage products, categories and orders behind `requireAdmin()`-gated Server
  Actions and pages.
- Deliberately no deletes, no image upload and no order-status editing -
  products and categories are referenced with `onDelete: "restrict"`, so
  removing either is a design decision, not a missing feature.
- Stock quantity is read and written uncached so a sale and an admin edit
  never race on stale numbers.

### Payments
- Stripe Checkout in test mode, with webhook **and** return-URL fulfilment
  racing safely on a single guarded status flip - stock is decremented
  exactly once no matter which caller wins.
- No stock reservation: a 35-minute session expiry bounds oversell, which is
  recorded rather than refused.

### Performance & correctness
- Next.js **Cache Components** (`cacheComponents: true`): every catalogue
  query is `"use cache"` with a `minutes` profile, while the order/pricing
  path (`src/lib/orders.ts`) reads the database uncached on purpose, so a
  buyer is never charged a stale price.
- Admin writes revalidate both the cached storefront (`revalidateTag`) and the
  client router cache (`revalidatePath`) so saved rows redisplay correctly.

## Tech Stack

- **[Next.js 16.4.6](https://nextjs.org/)** - App Router, Cache Components.
- **[TypeScript 5](https://www.typescriptlang.org/)** - type-safe end to end.
- **[Tailwind CSS 4](https://tailwindcss.com/)** - design tokens for light and
  dark mode, no JS theme toggle.
- **[Drizzle ORM](https://orm.drizzle.team/)** + **[Neon Postgres](https://neon.tech/)**
  - serverless HTTP driver for reads/writes, WebSocket driver (`dbTx`) for the
  two flows that need transactions (order creation, fulfilment).
- **[Better Auth](https://www.better-auth.com/)** - session-based auth, schema
  generated into `src/db/schema/auth.ts`.
- **[Stripe](https://stripe.com/)** - Checkout Sessions and webhooks, sandboxed
  in test mode.

## Structure

```
src/
  app/
    (auth)/sign-in, sign-up          Better Auth pages
    account/                         Signed-in buyer account page
    admin/                           Products, categories, orders back office
    api/auth/[...all]/               Better Auth route handler
    api/checkout/return/             Stripe return URL (empties the bag)
    api/stripe/webhook/              Stripe webhook (signature-authenticated)
    atelier/, campaign/              Editorial pages
    cart/, checkout/, checkout/complete/
    collections/[slug]/, collections/new/
    products/[slug]/
    search/
  components/
    product-card.tsx, product-gallery.tsx
    add-to-bag.tsx, bag-count.tsx
    site-header.tsx, site-footer.tsx, icons.tsx
  db/
    schema/                          catalog, auth, orders tables
    seed.mts                         Catalogue seed (npm run db:seed)
  lib/
    catalog.ts                       Cached catalogue queries + formatting
    admin.ts                         Uncached admin reads/writes
    orders.ts                        Uncached pricing + Stripe order flow
    cart.ts, stripe.ts, session.ts, auth.ts, auth-client.ts, env.ts
drizzle.config.ts                    drizzle-kit config
```

See `CLAUDE.md` for the detailed rules behind this structure (caching,
Cache Components gotchas, the admin/Stripe invariants, and known-benign
console warnings).

## Screenshots

<details>
<summary>Storefront <b>CLICK</b> to see</summary>

#### Homepage
![homepage](public/readme-screens/1%20homepage1.png)


#### Navbar
![navbar](public/readme-screens/2%20navbar.png)

#### Search
![search](public/readme-screens/3%20search%20bar.png)

#### Sign In
![sign in](public/readme-screens/4%20signin.png)

#### Sign Up
![sign up](public/readme-screens/5%20signup.png)

#### Your Account
![account](public/readme-screens/6%20your%20account.png)

#### Shopping Bag
![shopping bag](public/readme-screens/7%20shopping%20bag.png)

#### Collections
![collections](public/readme-screens/8%20collections.png)

#### Category
![category](public/readme-screens/9%20category.png)

#### Stripe Checkout Success
![stripe success](public/readme-screens/10%20stripe%20success.png)

</details>

<details>
<summary>Admin Back Office <b>CLICK</b> to see</summary>

#### Dashboard
![admin dashboard](public/readme-screens/11%20admin%20page.png)

#### Products
![admin products](public/readme-screens/12%20admin%20products.png)

#### New Product
![admin new product](public/readme-screens/13%20admin%20new%20product.png)

#### Edit Product
![admin edit product](public/readme-screens/14%20admin%20edit%20product.png)

#### Categories
![admin categories](public/readme-screens/14%20admin%20categories.png)

#### Orders
![admin orders](public/readme-screens/15%20admin%20orders.png)

</details>

## Get Started

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, BETTER_AUTH_SECRET, Stripe test keys
npm run db:migrate
npm run db:seed              # catalogue must be seeded before a build
npm run dev
```

Required env vars are validated on first use (`src/lib/env.ts`), so
`npm run build` needs them set too. Stripe is **test mode only** - `env.ts`
refuses any key that isn't `sk_test_`/`rk_test_`.

## Scripts

| Script | Purpose |
| --- | --- |
| `dev` / `build` / `start` | Next.js dev server / production build (also the only full typecheck) / production server |
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `auth:generate` | Generate Better Auth tables into `src/db/schema/auth.ts` |
| `auth:promote` | Grant a user admin by email |
| `db:generate` / `db:migrate` | Create / apply SQL migrations in `drizzle/` |
| `db:push` | Push schema directly to the DB (dev only) |
| `db:seed` | Re-seed the catalogue (clears it first) |
| `db:studio` | Drizzle Studio |

No test runner is configured yet.

## Testing Stripe locally

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` mints a new `whsec_` every run - paste it into `.env.local` or
every webhook call returns 400. A 400 on *every* webhook is usually a clock
skew issue, not a code bug: signed timestamps outside 300s are rejected.
