# CLAUDE.md

Guidance for Claude Code in this repository. `AGENTS.md` is a byte-identical
copy — edit both or neither.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
