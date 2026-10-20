import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { startCheckout } from "@/app/checkout/actions";
import { getCart } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { removeLine, setLineQuantity } from "./actions";

export const metadata: Metadata = {
  title: "Shopping bag — Atelier",
  robots: { index: false },
};

export default function CartPage({ searchParams }: PageProps<"/cart">) {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <h1 className="text-heading">Shopping bag</h1>
      {/* The bag is read from a cookie, so it is request-scoped and has to sit
          inside a boundary — an uncached read in the prerendered shell would
          fail the build under Cache Components. */}
      <Suspense fallback={<div className="mt-8 min-h-[18rem] md:mt-12" />}>
        <CartContents searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CartContents({
  searchParams,
}: {
  searchParams: PageProps<"/cart">["searchParams"];
}) {
  // Checkout found live stock short of what the bag showed, reduced it, and
  // sent the buyer back to approve the new total before anything charges.
  const adjusted = (await searchParams).checkout === "adjusted";
  const { lines, subtotalCents, itemCount } = await getCart();

  if (lines.length === 0) {
    return (
      <div className="mt-8 border-t border-line pt-10 md:mt-12">
        <p className="text-muted">Your bag is empty.</p>
        <Link href="/collections" className="btn btn-secondary mt-6">
          Browse collections
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-10 md:mt-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-16">
      <ul className="border-t border-line">
        {lines.map(({ product, quantity, clamped, lineTotalCents }, index) => (
          <li key={product.slug} className="flex gap-4 border-b border-line py-6 sm:gap-6">
            <Link
              href={`/products/${product.slug}`}
              className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-subtle sm:w-24"
            >
              <Image
                src={product.images[0]}
                alt={`${product.name} in ${product.material.toLowerCase()}`}
                fill
                sizes="96px"
                className="object-cover"
                {...(index === 0
                  ? // The first thumbnail is the only one above the fold, and
                    // Next flags it as the LCP element. `loading`/`fetchPriority`
                    // rather than `preload`, as the gallery does.
                    ({ loading: "eager", fetchPriority: "high" } as const)
                  : {})}
              />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="text-product">
                  <Link href={`/products/${product.slug}`} className="link-nav">
                    {product.name}
                  </Link>
                </h2>
                <p className="text-product tabular-nums">{formatPrice(lineTotalCents)}</p>
              </div>
              <p className="text-caption">{product.material}</p>
              <p className="text-caption tabular-nums">
                {formatPrice(product.priceCents)} each
              </p>

              {clamped && (
                <p role="status" className="text-caption text-accent">
                  Only {product.available} available — we reduced your quantity.
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
                <form action={setLineQuantity} className="flex items-center gap-2">
                  <input type="hidden" name="slug" value={product.slug} />
                  <label
                    htmlFor={`qty-${product.slug}`}
                    className="text-label text-muted"
                  >
                    Qty
                  </label>
                  <input
                    id={`qty-${product.slug}`}
                    name="quantity"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={product.available}
                    step={1}
                    defaultValue={quantity}
                    className="border-field w-16 px-2 py-1.5 text-center text-sm tabular-nums"
                  />
                  <button type="submit" className="btn btn-sm btn-secondary">
                    Update
                  </button>
                </form>

                <form action={removeLine}>
                  <input type="hidden" name="slug" value={product.slug} />
                  <button type="submit" className="btn btn-sm btn-ghost">
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="text-label text-muted">Summary</h2>
        <dl className="mt-4 border-t border-line">
          <div className="flex items-baseline justify-between border-b border-line py-4">
            <dt>
              Subtotal
              <span className="text-caption ml-2">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </dt>
            <dd className="tabular-nums">{formatPrice(subtotalCents)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-line py-4">
            <dt>Delivery</dt>
            <dd className="text-muted">Complimentary</dd>
          </div>
        </dl>

        {adjusted && (
          <p role="status" className="text-caption text-accent mt-6">
            Availability changed while you were shopping. Your bag has been
            updated — review the total and try again.
          </p>
        )}

        {/* The cap above is a shop-front guard against cached stock, not a
            reservation. `startCheckout` re-quotes against live stock and live
            prices, and is what the order is built from. */}
        <form action={startCheckout} className="mt-8">
          <button type="submit" className="btn btn-primary w-full">
            Checkout
          </button>
        </form>
        <Link href="/collections" className="btn btn-ghost mt-6">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
