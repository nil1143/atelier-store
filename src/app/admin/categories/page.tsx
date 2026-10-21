import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { listAdminCategories } from "@/lib/admin";
import { categoryKindLabels, categoryKinds } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "../admin-nav";
import { CategoryForm } from "./category-form";

export const metadata: Metadata = {
  title: "Categories — Admin",
  robots: { index: false },
};

/** The label map lives in `@/lib/catalog`; the client form cannot import it. */
const kindOptions = categoryKinds.map((value) => ({
  value,
  label: categoryKindLabels[value],
}));

export default function AdminCategoriesPage() {
  return (
    <div className="container-page pt-10 pb-16 md:pt-16 md:pb-24">
      <Suspense fallback={<div className="min-h-[8rem]" />}>
        <AdminCategories />
      </Suspense>
    </div>
  );
}

// The heading sits inside the boundary too: a non-admin gets a 404, so nothing
// about this page should render before the check passes.
async function AdminCategories() {
  await connection();

  await requireAdmin("/admin/categories");
  const categories = await listAdminCategories();

  return (
    <>
      <h1 className="text-heading">Categories</h1>
      <AdminNav current="/admin/categories" />

      <section className="mt-8 max-w-xl">
        <h2 className="text-label text-muted">Add a category</h2>
        <div className="mt-4">
          <CategoryForm kinds={kindOptions} />
        </div>
      </section>

      <h2 className="text-label text-muted mt-12">Existing</h2>
      {categories.length === 0 ? (
        <p className="mt-4 text-muted">No categories yet.</p>
      ) : (
        <ul className="mt-4 max-w-xl border-t border-line">
          {categories.map((category) => (
            <li key={category.id} className="border-b border-line py-6">
              <p className="text-product">
                {category.name}{" "}
                <span className="text-caption">
                  · {categoryKindLabels[category.kind]} · {category.slug}
                </span>
              </p>
              <div className="mt-4">
                <CategoryForm kinds={kindOptions} category={category} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
