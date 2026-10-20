import { cookies } from "next/headers";
import { getCartProducts, type CartProduct } from "@/lib/catalog";

/**
 * The bag lives in one httpOnly cookie that holds quantities and nothing else:
 * `[{"s":"<slug>","q":2}]`. Name, price, imagery and stock are re-read from the
 * catalogue on every render, so prices and the subtotal cannot go stale and
 * there is no cart table to keep in step. Because the cookie is httpOnly it is
 * written only by the Server Actions in `src/app/cart/actions.ts`, which is
 * what keeps every quantity check server-side.
 */
export const CART_COOKIE = "atelier_cart";

/** One stored line. Short keys: the whole bag has to fit in 4 KB. */
type StoredLine = { s: string; q: number };

/** Distinct products one bag may hold — a bound on the cookie's size. */
export const MAX_LINES = 20;

/** Per-line ceiling applied before stock, so a silly number can't be stored. */
const MAX_LINE_QUANTITY = 99;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
} as const;

export type CartLine = {
  product: CartProduct;
  quantity: number;
  /** The cookie asked for more than `product.available`, so this was reduced. */
  clamped: boolean;
  lineTotalCents: number;
};

export type Cart = {
  lines: CartLine[];
  subtotalCents: number;
  itemCount: number;
};

/**
 * Tolerant by design: a cookie that was truncated, hand-edited or written by an
 * older format reads as an empty bag rather than throwing on a page render.
 */
export function parseCart(value: string | undefined): StoredLine[] {
  if (!value) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const lines: StoredLine[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const { s, q } = entry as { s?: unknown; q?: unknown };
    if (typeof s !== "string" || s.length === 0 || s.length > 128) continue;
    if (typeof q !== "number" || !Number.isInteger(q) || q <= 0) continue;
    if (seen.has(s)) continue;

    seen.add(s);
    lines.push({ s, q: Math.min(q, MAX_LINE_QUANTITY) });
    if (lines.length >= MAX_LINES) break;
  }

  return lines;
}

/** The raw stored lines — unvalidated against the catalogue. */
export async function readStoredCart(): Promise<StoredLine[]> {
  const store = await cookies();
  return parseCart(store.get(CART_COOKIE)?.value);
}

/** Writes the bag, clearing the cookie entirely once it is empty. */
export async function writeStoredCart(lines: StoredLine[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, JSON.stringify(lines.slice(0, MAX_LINES)), cookieOptions);
}

/**
 * The bag as the storefront shows it: live product data, quantities clamped to
 * stock a second time, and totals in integer cents.
 *
 * Clamping here as well as on write is what makes the stock rule total — a
 * cookie edited by hand, or stock reduced after the add, still renders a legal
 * bag, and `clamped` lets the page say why the number changed.
 */
export async function getCart(): Promise<Cart> {
  const stored = await readStoredCart();
  const catalogue = await getCartProducts(stored.map((line) => line.s));
  const bySlug = new Map(catalogue.map((product) => [product.slug, product]));

  const lines: CartLine[] = [];
  for (const { s, q } of stored) {
    const product = bySlug.get(s);
    // Dropped: a product deleted from the catalogue, or one now sold out.
    if (!product || product.available === 0) continue;

    const quantity = Math.min(q, product.available);
    lines.push({
      product,
      quantity,
      clamped: quantity < q,
      lineTotalCents: product.priceCents * quantity,
    });
  }

  return {
    lines,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

/** Units in the bag, for the header. Zero when the bag is empty. */
export async function getCartItemCount(): Promise<number> {
  return (await getCart()).itemCount;
}

/**
 * The bag as quantities alone, with the cookie's short keys expanded. This is
 * what checkout quotes against: it is the raw *request*, not the clamped view
 * `getCart` builds, because the clamping there runs on cached stock and
 * checkout has to re-decide against live stock itself.
 */
export async function readRequestedLines(): Promise<
  { slug: string; quantity: number }[]
> {
  const stored = await readStoredCart();
  return stored.map(({ s, q }) => ({ slug: s, quantity: q }));
}
