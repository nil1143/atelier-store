# CLAUDE.md

Guidance for Claude Code in this repository. `AGENTS.md` is a byte-identical
copy — edit both or neither.


## Commands

```bash
npm run dev          # Next dev server (rewrites the agent-rules block in AGENTS.md)
npm run build        # Production build — also the only full typecheck (tsc has noEmit)
npm run lint         # ESLint (flat config, eslint-config-next core-web-vitals + TS)

npm run db:generate  # Emit SQL migrations from src/db/schema.ts into ./drizzle
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema straight to the DB (no migration file) — dev only
npm run db:studio    # Drizzle Studio
npm run db:seed      # Re-seed the catalogue from scripts/seed.ts (clears it first)
```

No test runner is configured yet.

## Next.js 16

This project is on Next.js **16.4.0**, which differs from most training data.
Read `node_modules/next/dist/docs/` before writing Next-specific code.

Gotchas already hit here — do not "correct" these back:
- **`<Image preload>` is right; `priority` is the deprecated one.** Next 16
  reversed this. The homepage hero uses `preload` deliberately.
- Do **not** use `preload` where several images could be the LCP element — use
  `loading="eager"` + `fetchPriority="high"` instead, as the product gallery
  does on its first frame.
- `params` is a `Promise`. The typed `PageProps<"/route">` helpers live in
  `.next/types/`, so a **new route's type does not exist until `next build` or
  `next dev` has run** — `npm run typecheck` alone will not create it.
- `cacheComponents: true` is on. With `generateStaticParams`, params are
  build-time known and can be awaited at the top level without `<Suspense>`.

## Working rules

**Every exported query in `src/lib/catalog.ts` must open with `"use cache"` +
`cacheLife("minutes")`.** Under `cacheComponents`, an uncached DB read in a
prerendered shell fails the build with `blocking-prerender-dynamic`. This is why
the storefront has no `<Suspense>` boundary anywhere.

**`catalog.ts` owns catalog formatting as well as its queries** — new label maps
for catalog fields go there, not in a page. **Pages never import `@/db`.**

**Seed before building.** `generateStaticParams` must return at least one param
under Cache Components, so `next build` against an empty `products` table fails
with `empty-generate-static-params`. Run `db:migrate` then `db:seed` first, in
CI too. The seed upserts on `slug`, which is what makes it sound on the Neon
HTTP driver — that driver has no transactions.

**`src/db/schema/auth.ts` is generated** by `npm run auth:generate` from
`src/lib/auth.ts`. Never hand-edit it.

**Auth reads go through `src/lib/session.ts`.** `requireUser` / `requireAdmin`
read the request, so under Cache Components they must run inside a
`<Suspense>` boundary, never at a layout's top level. `src/proxy.ts` only checks
that a session cookie exists; it is not the security boundary. **Every admin
Server Action and Route Handler must call `requireAdmin()` itself** — a page's
check does not protect them. `user.role` cannot be set through the auth API
(`input: false`); grant admin with `npm run auth:promote -- <email>`.

`auth:generate` uses the deprecated `@better-auth/cli` on purpose: the newer
`auth` CLI cannot resolve the `@/` import alias in `src/lib/auth.ts`.

**Dark-mode token values are duplicated** in a `prefers-color-scheme` block
*and* a `:root[data-theme="dark"]` block in `globals.css` — edit both. There is
no JS theme toggle. Reuse the existing component classes before adding new ones.

**Scratch scripts belong in the scratchpad, not the project root.** A stray
`*.tmp.mts` there fails `npm run build` — `tsc` typechecks it. Anything that
must sit in the root to resolve `.env.local` through `dotenv` has to be deleted
before building.

## Stripe Checkout

Sandbox `acct_1US1snRrCouIfAx2` ("nil1143"); a second sandbox exists — do not
use it. Nothing is live, and there are no production keys in this repo.

**`src/lib/orders.ts` reads the catalogue uncached, on purpose.** It is the one
place that must *not* follow the `catalog.ts` `"use cache"` rule above — a
minutes-stale price is a wrong amount charged. Do not "fix" it.

**Fulfilment is exactly-once by a guarded status flip, not by ordering.** The
webhook and the buyer's return route both call `fulfillCheckoutSession`;
concurrent callers race on `WHERE status = 'pending'` inside one `dbTx`
transaction and only the winner decrements stock. Never split that flip from
the decrement — a crash between them would mark an order paid whose stock was
never taken, and the retry would see `paid` and skip it.

**Only `dbTx` has transactions** (Neon's WebSocket driver). Order creation and
fulfilment use it; everything else uses `db`, the HTTP driver, which has none.

**Stock moves revalidate the catalogue with `revalidateTag(CATALOG_TAG,
{ expire: 0 })`.** That second argument is how long stale content may still be
served, so a named profile would show the next visitor a sold-out piece as in
stock. `updateTag` would be preferable but does not exist for a Route Handler,
which is the only place fulfilment runs. Verified: the first request after a
sale is a blocking refresh.

**The webhook is authenticated by Stripe's signature alone.** It must stay out
of `src/proxy.ts`'s matcher and must never require a session. Read the body
with `text()` and never parse it — verification needs the exact bytes Stripe
signed. It records an event in `stripeEvents` only *after* handling succeeds,
so a 500 plus Stripe's retry redoes the work instead of skipping it as seen.
`cacheComponents` rejects `runtime` / `dynamic` segment config here; route
handlers are already dynamic and already on Node.

**Stripe's return URL is a Route Handler, not the confirmation page** — Next
only allows cookie writes there, and emptying the bag is the one thing the
webhook cannot do, having no browser to write to.

Deliberate, do not silently reverse: sign-in is required to check out, so
`orders.userId` is `notNull` and guest checkout is a future migration rather
than an unused column · there is no stock reservation, bounded instead by a
35-minute session expiry, with rare oversell recorded on `orders.oversold` and
floored at 0 rather than refused · line items are inline `price_data`, not
synced Stripe `Price` objects, so there is one source of truth · `getStripe()`
is lazy so payment keys are not required merely to import `@/lib/orders` ·
`apiVersion` is unset so the SDK's types and the wire format cannot disagree ·
`APP_URL` is never derived from the request `Host` header, which would let a
forged host aim a buyer's return URL elsewhere.

### Testing against Stripe

- `stripe listen` mints a **new** `whsec_` every run — paste it into
  `.env.local` or every webhook returns 400.
- A 400 on *every* webhook is usually the **machine clock**, not the code:
  signed timestamps outside 300s are rejected. Check skew against Stripe's
  `Date` header. Never widen the tolerance; that trades away replay protection.
- `stripe events resend` signs with the event's *original* timestamp, so
  anything older than 5 minutes is correctly rejected. Resend within 5 minutes
  of a real purchase, or drive the return-URL path, which has no signature.
- Cache behaviour is only meaningful in `npm run build` + `npm start`. When
  proving a revalidation, pick stock values whose labels differ either side of
  the change (`1 -> 0` crosses to "Sold out"; the threshold is 3) — the
  `minutes` profile revalidates in the background at 60s, so a test run inside
  one label band proves nothing.
- The browser extension has no permission for `checkout.stripe.com`; card
  entry needs either a granted permission or the user.

## Verifying UI work

A screenshot pass has caught real flaws here twice. `resize_window` reports
success without resizing — for responsive checks, load the page in a
same-origin iframe at the target width, since media queries evaluate against
the iframe's own viewport.

Benign console noise on the PDP — do not chase:
- `params accessed outside <Suspense>` in dev.
- An LCP warning naming the gallery's first image. Next keys its image registry
  by rendered `src` and warns on *every* intermediate LCP candidate; the one it
  names is the lazy thumbnail that paints before the large eager frame.

`src/lib/env.ts` throws at module load, so `npm run build` fails on a checkout
without `.env.local` — it dies collecting page data for `/api/auth/[...all]`,
which is not a bug in that route.
