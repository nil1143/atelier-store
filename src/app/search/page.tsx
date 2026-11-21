import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import {
  getCategories,
  normaliseSearchTerm,
  searchProducts,
  SEARCH_MAX_LENGTH,
} from "@/lib/catalog";
import { SearchField, SearchForm } from "./search-form";

export const metadata: Metadata = {
  title: "Search — Atelier",
  description: "Search the Atelier collection by piece, material or category.",
  // Result pages are one per typed term; none of them is a page worth indexing.
  robots: { index: false },
};

/**
 * The heading and field are the static shell. `searchParams` is request data,
 * so everything that reads it sits inside `<Suspense>` and hands the term to
 * the cached `searchProducts`.
 */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="pt-6 pb-16 md:pt-10 md:pb-24">
      <div className="container-page">
        <div className="mb-8 max-w-2xl md:mb-12">
          <p className="text-label mb-3 text-muted">Search</p>
          <h1 className="text-heading">Find a piece</h1>
          <div className="mt-6 md:mt-8">
            <Suspense fallback={<SearchField maxLength={SEARCH_MAX_LENGTH} />}>
              <SearchForm maxLength={SEARCH_MAX_LENGTH} />
            </Suspense>
          </div>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="container-page">
            <p className="text-caption">Searching…</p>
          </div>
        }
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const term = normaliseSearchTerm((await searchParams).q);

  if (term === "") {
    return (
      <div className="container-page">
        <Suggestions heading="Or browse by category" />
      </div>
    );
  }

  const products = await searchProducts(term);

  if (products.length === 0) {
    return (
      <div className="container-page">
        <p role="status" className="border-t border-line pt-6 text-muted">
          Nothing matches “{term}”. Try a single word — a material, or the kind of
          piece.
        </p>
        <Suggestions heading="Browse by category" />
      </div>
    );
  }

  return (
    <>
      <div className="container-page">
        <p role="status" className="text-caption mb-4">
          {products.length} {products.length === 1 ? "piece" : "pieces"} for “{term}”
        </p>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </>
  );
}

async function Suggestions({ heading }: { heading: string }) {
  const categories = await getCategories();

  return (
    <section className="mt-10">
      <h2 className="text-label mb-4 text-muted">{heading}</h2>
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/collections/${c.slug}`} className="btn btn-secondary btn-sm">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
