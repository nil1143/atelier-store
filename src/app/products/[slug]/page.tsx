import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBag } from "@/components/add-to-bag";
import { ProductGallery } from "@/components/product-gallery";
import {
  formatPrice,
  getProductBySlug,
  getProductSlugs,
  stockLabels,
  type StockState,
} from "@/lib/catalog";

const stockDot: Record<StockState, string> = {
  "in-stock": "bg-foreground",
  "low-stock": "bg-accent",
  "sold-out": "bg-mist",
};

const details = [
  { term: "Origin", value: "Cut and finished in Italy." },
  {
    term: "Shipping and returns",
    value: "Complimentary delivery, and thirty days to return unworn pieces.",
  },
];

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return {};

  return {
    title: `${product.name} — Atelier`,
    description: `${product.name} in ${product.material.toLowerCase()}, ${formatPrice(product.priceCents)}.`,
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const category = product.categoryName;
  const soldOut = product.stock === "sold-out";

  return (
    <article className="container-page pt-6 pb-16 md:pt-10 md:pb-24">
      <nav aria-label="Breadcrumb" className="mb-6 md:mb-10">
        <ol className="text-label flex flex-wrap items-center gap-x-2 text-muted">
          <li>
            <Link href="/" className="link-nav">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/collections/${product.categorySlug}`} className="link-nav">
              {category}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-16">
        {/* Imagery */}
        <ProductGallery
          images={product.images}
          alt={`${product.name} in ${product.material.toLowerCase()}`}
          isNew={product.isNew}
        />

        {/* Information */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-label mb-3 text-muted">{category}</p>
          <h1 className="text-heading">{product.name}</h1>
          <p className="mt-4 text-muted">{product.material}</p>

          <p className="mt-6 text-base tabular-nums">{formatPrice(product.priceCents)}</p>

          <p className="text-caption mt-4 flex items-center gap-2">
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${stockDot[product.stock]}`}
            />
            {stockLabels[product.stock]}
          </p>

          <AddToBag slug={product.slug} soldOut={soldOut} />

          <dl className="mt-12 border-t border-line">
            {details.map((d) => (
              <div key={d.term} className="border-b border-line py-5">
                <dt className="text-label text-muted">{d.term}</dt>
                <dd className="mt-2">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </article>
  );
}
