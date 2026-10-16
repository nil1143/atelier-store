import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import {
  getCategoryBySlug,
  getCategorySlugs,
  getProductsByCategory,
} from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return {};

  return {
    title: `${category.name} — Atelier`,
    description: `The ${category.name.toLowerCase()} collection: pieces cut and finished in Italy, in small runs.`,
  };
}

export default async function CollectionPage({
  params,
}: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) notFound();

  const products = await getProductsByCategory(slug);

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
            <li>
              <Link href="/collections" className="link-nav">
                Collections
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-foreground">
              {category.name}
            </li>
          </ol>
        </nav>

        <div className="mb-8 max-w-xl md:mb-12">
          <p className="text-label mb-3 text-muted">The collection</p>
          <h1 className="text-heading">{category.name}</h1>
          <p className="mt-4 text-muted">
            Cut and finished in Italy, in runs small enough that we know the hands behind
            each piece.
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
            Nothing in {category.name.toLowerCase()} on the rail just now —{" "}
            <Link href="/collections/new" className="link-inline">
              see what has just arrived
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
