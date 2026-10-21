import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listAdminProducts, type AdminProduct } from "@/lib/admin";
import { formatPrice, stockLabels, stockStateFor } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "../admin-nav";
import { updateStock } from "../actions";

export const metadata: Metadata = {
  title: "Products — Admin",
  robots: { index: false },
};

export default function AdminProductsPage() {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <Suspense fallback={<div className="min-h-[8rem]" />}>
        <AdminProducts />
      </Suspense>
    </div>
  );
}

// The heading sits inside the boundary too: a non-admin gets a 404, so nothing
// about this page should render before the check passes.
async function AdminProducts() {
  await connection();

  await requireAdmin("/admin/products");
  // Deliberately after the check, not in parallel with it.
  const products = await listAdminProducts();

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-heading">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          New product
        </Link>
      </div>

      <AdminNav current="/admin/products" />

      {products.length === 0 ? (
        <p className="mt-8 text-muted">
          No products yet. Seed the catalogue, or add the first one.
        </p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * One row: what the piece is, and its stock as a live field. The storefront's
 * own label is shown beside the number so the three display states
 * (`stockLabels`) are visible without having to remember the threshold.
 */
function ProductRow({ product }: { product: AdminProduct }) {
  // The same "most specific category wins" rule the storefront labels by.
  const category = product.productTypeName ?? product.departmentName;
  const stock = stockLabels[stockStateFor(product.quantity)];

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-5">
      <div className="min-w-[14rem] flex-1">
        <p className="text-product">{product.name}</p>
        <p className="text-caption">
          {category ?? "Uncategorised"} · {product.slug} ·{" "}
          {formatPrice(product.priceCents)}
        </p>
      </div>

      {/* A plain form, so stock can be saved with JavaScript unavailable. */}
      <form action={updateStock} className="flex items-center gap-2">
        <input type="hidden" name="slug" value={product.slug} />
        <label className="text-label" htmlFor={`qty-${product.id}`}>
          Stock
        </label>
        <input
          id={`qty-${product.id}`}
          name="quantity"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={product.quantity}
          className="border-field w-20 px-2 py-1.5 text-sm tabular-nums"
        />
        <button type="submit" className="btn btn-secondary btn-sm">
          Save
        </button>
        <span className="text-caption w-28">{stock}</span>
      </form>

      <Link
        href={`/admin/products/${product.slug}/edit`}
        className="link-inline text-sm"
      >
        Edit
      </Link>
    </li>
  );
}
