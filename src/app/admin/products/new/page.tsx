import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { listAdminCategories } from "@/lib/admin";
import { homepageSectionLabels, homepageSections } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "../../admin-nav";
import { ProductForm } from "../product-form";

export const metadata: Metadata = {
  title: "New product — Admin",
  robots: { index: false },
};

/** The label map lives in `@/lib/catalog`; the client form cannot import it. */
const sectionOptions = homepageSections.map((value) => ({
  value,
  label: homepageSectionLabels[value],
}));

export default function NewProductPage() {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <Suspense fallback={<div className="min-h-[8rem]" />}>
        <NewProduct />
      </Suspense>
    </div>
  );
}

// The heading sits inside the boundary too: a non-admin gets a 404, so nothing
// about this page should render before the check passes.
async function NewProduct() {
  await connection();

  await requireAdmin("/admin/products/new");
  const categories = await listAdminCategories();

  return (
    <>
      <h1 className="text-heading">New product</h1>
      <AdminNav current="/admin/products" />
      <ProductForm categories={categories} sections={sectionOptions} />
    </>
  );
}
