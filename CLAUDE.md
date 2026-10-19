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
