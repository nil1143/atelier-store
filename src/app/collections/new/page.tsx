import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "New arrivals — Atelier",
  description:
    "The latest pieces to enter the Atelier catalogue: ready-to-wear, leather goods and jewellery, in the order they arrived.",
};

export default async function NewArrivalsPage() {
  const products = await getNewArrivals();

  return (
    <div className="pt-6 pb-16 md:pt-10 md:pb-24">
      <div className="container-page">
        <nav aria-label="Breadcrumb" className="mb-6 md:mb-10">
          <ol className="text-label flex flex-wrap items-center gap-x-2 text-muted">
            <li>
              <Link href="/" className="link-nav">
                Home
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground">
              New arrivals
            </li>
          </ol>
        </nav>

        <div className="mb-8 max-w-xl md:mb-12">
          <p className="text-label mb-3 text-muted">Just in</p>
          <h1 className="text-heading">New arrivals</h1>
          <p className="mt-4 text-muted">
            The most recent pieces to reach the rail, newest first. Runs are small, so what
            is here now is what there is.
          </p>
          {products.length > 0 && (
            <p className="text-caption mt-4">
              {products.length} {products.length === 1 ? "piece" : "pieces"}
            </p>
          )}
        </div>
      </div>

      {products.length > 0 ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <div className="container-page">
          <p className="border-t border-line pt-6 text-muted">
            Nothing new on the rail just now. The next delivery is being cut —{" "}
            <Link href="/collections/women" className="link-inline">
              browse the collection
            </Link>{" "}
            in the meantime.
          </p>
        </div>
      )}
    </div>
  );
}
