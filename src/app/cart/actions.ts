"use server";

import { MAX_LINES, readStoredCart, writeStoredCart } from "@/lib/cart";
import { getCartProducts } from "@/lib/catalog";

/**
 * The bag's only writers. Every one of them re-reads stock and clamps to it, so
 * the quantity rule holds whatever a form posts — the cookie is httpOnly, so
 * this is the sole path to it.
 *
 * Nothing here is cached, so there is nothing to revalidate: `/cart` and the
 * header count both read the cookie per request.
 */

function slugFrom(formData: FormData): string {
  const value = formData.get("slug");
  return typeof value === "string" ? value.trim() : "";
}

/** Units on hand, or 0 for a slug that is not in the catalogue. */
async function availableFor(slug: string): Promise<number> {
  if (!slug) return 0;
  const [product] = await getCartProducts([slug]);
  return product?.available ?? 0;
}

export async function addToCart(formData: FormData): Promise<void> {
  const slug = slugFrom(formData);
  const available = await availableFor(slug);
  if (available === 0) return;

  const lines = await readStoredCart();
  const existing = lines.find((line) => line.s === slug);

  if (existing) {
    existing.q = Math.min(existing.q + 1, available);
  } else {
    if (lines.length >= MAX_LINES) return;
    lines.push({ s: slug, q: 1 });
  }

  await writeStoredCart(lines);
}

export async function setLineQuantity(formData: FormData): Promise<void> {
  const slug = slugFrom(formData);
  const raw = formData.get("quantity");
  const requested = Number.parseInt(typeof raw === "string" ? raw : "", 10);
  if (!slug || Number.isNaN(requested)) return;

  const lines = await readStoredCart();
  const existing = lines.find((line) => line.s === slug);
  if (!existing) return;

  // Anything at or below zero is a removal, which is what the stepper's lower
  // bound means when it is pushed past 1.
  if (requested <= 0) {
    await writeStoredCart(lines.filter((line) => line.s !== slug));
    return;
  }

  const available = await availableFor(slug);
  if (available === 0) {
    await writeStoredCart(lines.filter((line) => line.s !== slug));
    return;
  }

  existing.q = Math.min(requested, available);
  await writeStoredCart(lines);
}

export async function removeLine(formData: FormData): Promise<void> {
  const slug = slugFrom(formData);
  if (!slug) return;

  const lines = await readStoredCart();
  await writeStoredCart(lines.filter((line) => line.s !== slug));
}
