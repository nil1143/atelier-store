import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="card group pb-6">
      <div className="card-media">
        <Image
          src={product.images[0]}
          alt={`${product.name} in ${product.material.toLowerCase()}`}
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
        {product.isNew && (
          <span className="text-label absolute left-3 top-3 bg-chalk px-2 py-0.5 text-[0.625rem] text-ink">
            New
          </span>
        )}
      </div>
      <div className="card-body px-3 sm:px-4">
        <h3 className="text-product">{product.name}</h3>
        <p className="text-caption">{product.material}</p>
        <p className="text-product mt-1 tabular-nums">{formatPrice(product.priceCents)}</p>
      </div>
    </Link>
  );
}
