# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses **Next.js 16.4.0**, which has breaking changes from previous versions. Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. APIs, conventions, and file structure may differ from training data.

Gotchas already hit in this repo — do not "correct" these back:
- **`<Image preload>` is right; `priority` is the deprecated one.** Next 16 reversed this. The homepage hero uses `preload` deliberately.
- Do **not** use `preload` where several images could be the LCP element — use `loading="eager"` + `fetchPriority="high"` instead. The product gallery does this on its first frame.
- `params` is a `Promise` and must be awaited. Typed `PageProps<"/route">` helpers are generated into `.next/types/`, so a **new route's type only exists after `next build` or `next dev` has run** — `npm run typecheck` alone will not create it.
- `cacheComponents: true` is on. With `generateStaticParams`, params are build-time known and can be awaited at the top level without `Suspense`.

## Commands

```bash
npm run dev          # Start dev server (uses Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check without emitting

# Database (Drizzle + Neon Postgres)
npm run db:generate  # Generate migration files from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:push      # Push schema directly (dev only, skips migration files)
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Upsert catalog seed data (idempotent)

# Auth schema
npm run auth:generate  # Regenerate src/db/schema/auth.ts from src/lib/auth.ts
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` — Neon pooled connection string
- `BETTER_AUTH_SECRET` — generate with `npx @better-auth/cli secret`
- `BETTER_AUTH_URL` — server-side base URL
- `NEXT_PUBLIC_APP_URL` — browser-side base URL

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · Neon (serverless Postgres) · Better Auth

**Key files:**
- `src/db/index.ts` — Drizzle client singleton (`db`) using Neon HTTP driver
- `src/db/schema/index.ts` — all Drizzle table exports; add new schema files here and re-export
- `src/lib/auth.ts` — Better Auth server config (server-only); `nextCookies()` plugin must remain last
- `src/lib/auth-client.ts` — Better Auth browser client (`authClient`); import in Client Components
- `src/lib/env.ts` — typed, validated env accessors; add new required vars here
- `src/app/api/auth/[...all]/route.ts` — catch-all auth API handler

**Auth flow:** Better Auth handles sessions via `src/app/api/auth/[...all]`. Server-side calls use `auth` from `src/lib/auth.ts`; client-side calls use `authClient` from `src/lib/auth-client.ts`. Auth providers/methods are not yet configured — add them in `src/lib/auth.ts`, then re-run `npm run auth:generate` to update the DB schema.

**Database schema:** Drizzle table files go in `src/db/schema/`. The catalog tables are in `catalog.ts`. After editing schema, run `db:generate` then `db:migrate` (or `db:push` in local dev). The auth schema (`src/db/schema/auth.ts`) is code-generated — do not edit it manually.

**Path alias:** `@/` maps to `src/`.

## Storefront

The storefront reads products, categories and stock from Postgres via `src/lib/catalog.ts`.

**Key files:**
- `src/lib/catalog.ts` — every catalog query, plus `formatPrice` and `stockLabels`. This module owns catalog *formatting* too, not just the queries: new label maps for catalog fields belong here, not in a page. **Pages never import `@/db` directly.**
- `src/db/schema/catalog.ts` — the `categories` and `products` tables
- `src/db/seed.mts` — catalog seed data (`npm run db:seed`)
- `src/components/product-gallery.tsx` — PDP image gallery (Client Component)
- `src/components/product-card.tsx` — grid card; links to `/products/[slug]`
- `src/app/globals.css` — design tokens and every shared component class

**Every exported query in `catalog.ts` opens with `"use cache"` + `cacheLife("minutes")`.** `cacheComponents: true` means an uncached DB read in a prerendered shell fails the build with `blocking-prerender-dynamic`. Minutes rather than the default because stock changes and a stale "In stock" badge is a real defect. This is why the storefront needs no `<Suspense>` boundary anywhere.

**Seed before building.** `generateStaticParams` must return at least one param under Cache Components, so `next build` against an empty `products` table fails with `empty-generate-static-params`. Run `db:migrate` then `db:seed` first, in CI too. The seed upserts on `slug`, so re-running it is safe and corrects drift — which is what makes it sound on the Neon HTTP driver, since that driver has no transactions.

**Categories are two orthogonal axes sharing one table:** `kind = 'department'` (women, men) and `kind = 'type'` (bags, shoes, jewellery, accessories), with one nullable FK per axis on `products` — so a women's bag is both. Do not split this into two tables: one table is what keeps slugs unique *across* both axes, which is what makes a flat `/collections/[slug]` unambiguous. Faceting is a plain `WHERE`, no join table; reading both axes at once means joining `categories` twice through Drizzle's `alias()`.
- A plain FK **cannot** check that `department_id` points at a `kind = 'department'` row. That invariant is kept by `resolve()` in `src/db/seed.mts`, not by the database.

**Stock is a quantity.** `products.quantity` is the stored fact; `stockStateFor` derives the three display states from it against `LOW_STOCK_THRESHOLD` in `catalog.ts`, which is the one place that rule lives. There is no stock enum in the database.

**Two check constraints carry type guarantees** — do not drop them and do not add redundant runtime guards for them:
- `products_images_not_empty` is why `Product.images` can be a non-empty tuple (`readonly [string, ...string[]]`) and `images[0]` needs no guard.
- `products_has_category` is why "most specific category wins" (type if present, else department) is total. The PDP breadcrumb needs a link as well as a label, so `toProduct` returns both `categorySlug` and `categoryName`.

`toProduct` re-asserts both and throws naming the slug — a throw there means data was written around a constraint.

**Product imagery:** `views(id)` in `src/db/seed.mts` derives three framings from one Unsplash photo ID. This is documented placeholder data standing in for real alternate photography — when real shots exist, put literal URL arrays in the seed and delete the helper. An Unsplash `crop=` is **silently ignored unless `w` and `h` force an aspect ratio different from the source**, and an out-of-range `rect=` is silently ignored too, so alternate views must force a different aspect or they return the same photo three times with no error.

**Styling:** Reuse the classes in `globals.css` before adding new ones — e.g. `.card-media` already supplies a 3:4 `overflow-hidden` frame with `object-fit: cover`, and the gallery reuses it for both its main frame and its thumbnails. Dark-mode values are duplicated in a `prefers-color-scheme` block **and** a `:root[data-theme="dark"]` block; edit both. There is no JS theme toggle.

**Verifying UI work:** a screenshot pass has caught real flaws here twice. For responsive checks, note that `resize_window` reports success without resizing; load the page in a same-origin iframe at the target width instead, since media queries evaluate against the iframe's own viewport.

**Known benign console noise on the PDP** — do not chase these:
- `params accessed outside <Suspense>` in dev.
- An LCP warning naming the gallery's first image. Next keys its image registry by rendered `src` and warns on *every* intermediate LCP candidate; the one it names is the lazy thumbnail that paints before the large eager frame. The main frame is correctly `eager` + `fetchPriority="high"`.

**Builds require env vars.** `src/lib/env.ts` throws at module load, so `npm run build` fails on a checkout without `.env.local` — it dies collecting page data for `/api/auth/[...all]`, which is not a bug in the page being built.
