import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getAdminProduct, listAdminCategories } from "@/lib/admin";
import { homepageSectionLabels, homepageSections } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "../../../admin-nav";
import { ProductForm } from "../../product-form";

export const metadata: Metadata = {
  title: "Edit product — Admin",
  robots: { index: false },
};

/** The label map lives in `@/lib/catalog`; the client form cannot import it. */
const sectionOptions = homepageSections.map((value) => ({
  value,
  label: homepageSectionLabels[value],
}));

/**
 * No `generateStaticParams`: this page is per-request (`connection()`), so the
 * Cache Components rule that one must return at least one param does not reach
 * it. That also means `params` is *not* build-time known, so it is handed down
 * unawaited — awaiting it here would read runtime data outside the boundary
 * and fail the prerender with `blocking-prerender-dynamic`.
 */
export default function EditProductPage({
  params,
}: PageProps<"/admin/products/[slug]/edit">) {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <Suspense fallback={<div className="min-h-[8rem]" />}>
        <EditProduct params={params} />
      </Suspense>
    </div>
  );
}

// The heading sits inside the boundary too: a non-admin gets a 404, so nothing
// about this page should render before the check passes.
async function EditProduct({
  params,
}: {
  params: PageProps<"/admin/products/[slug]/edit">["params"];
}) {
  await connection();

  const { slug } = await params;
  await requireAdmin(`/admin/products/${slug}/edit`);
  // Deliberately after the check, not in parallel with it.
  const product = await getAdminProduct(slug);
  if (!product) notFound();

  const categories = await listAdminCategories();

  return (
    <>
      <h1 className="text-heading">{product.name}</h1>
      <AdminNav current="/admin/products" />
      <ProductForm
        categories={categories}
        sections={sectionOptions}
        product={product}
      />
    </>
  );
}
