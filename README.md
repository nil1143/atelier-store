# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS, with Better Auth, Drizzle ORM and Neon Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run dev
```

Required env vars are validated on first use (`src/lib/env.ts`), so `npm run build` needs them set too.

## Structure

```
src/
  app/
    api/auth/[...all]/route.ts   Better Auth route handler
    products/[slug]/page.tsx     Product detail page
    layout.tsx, page.tsx         Root layout, homepage
  components/
    product-card.tsx, site-header.tsx, site-footer.tsx, icons.tsx
  db/
    index.ts                     Drizzle client (Neon HTTP driver)
    schema/index.ts              Schema barrel
    schema/catalog.ts            categories + products tables
    seed.mts                     Catalog seed data (npm run db:seed)
  lib/
    auth.ts                      Better Auth server instance
    auth-client.ts               Better Auth React client
    env.ts                       Server env access
    catalog.ts                   Catalog queries + formatting (Product,
                                  formatPrice, stockLabels, getProductBySlug)
drizzle.config.ts                drizzle-kit config
```

The homepage and `/products/[slug]` read the catalog from Postgres through `src/lib/catalog.ts`. Product imagery is still placeholder Unsplash data, generated in `src/db/seed.mts`.

Because `cacheComponents` is on, every query in `catalog.ts` is wrapped in `"use cache"`, and the database must be seeded before `npm run build` — `generateStaticParams` has to return at least one product.

## Scripts

| Script | Purpose |
| --- | --- |
| `dev` / `build` / `start` | Next.js |
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `auth:generate` | Generate Better Auth tables into `src/db/schema/auth.ts` |
| `db:generate` / `db:migrate` | Create / apply SQL migrations in `drizzle/` |
| `db:push` | Push schema directly (prototyping) |
| `db:seed` | Upsert the catalog seed data (idempotent) |
| `db:studio` | Drizzle Studio |

## Next steps

1. Run `npm run auth:generate`, then add `export * from "./auth";` to `src/db/schema/index.ts`.
2. `npm run db:generate && npm run db:migrate`.
3. Enable auth methods (e.g. `emailAndPassword`) in `src/lib/auth.ts`.
4. Fix `.env.local` with real values — `npm run build` currently fails on a clean checkout because `BETTER_AUTH_SECRET` (and likely other required vars) aren't set.
5. Build a `/collections/[slug]` listing route — the `categories` table supports it for either axis (`department_id` or `product_type_id`); right now the only "listing" is the two product grids on the homepage.
6. Wire up "Add to bag" once a cart exists (currently presentational, like the other unbuilt links: `/campaign`, `/atelier`, `/collections/*`).
7. Drive `site-header.tsx`'s hardcoded `navLinks` from the `categories` table.
