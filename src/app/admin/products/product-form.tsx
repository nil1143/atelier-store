"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import type { AdminCategory, AdminProduct } from "@/lib/admin";
import { useRestoreSelects } from "../use-restore-selects";
import { createProduct, updateProductAction, type AdminFormState } from "../actions";

/**
 * The homepage sections, handed down from the page rather than imported:
 * `@/lib/catalog` reaches the database and `cacheTag`, so a client component
 * cannot pull it in.
 */
export type SectionOption = { value: string; label: string };

const inputClass = "border-field w-full px-3 py-2.5 text-sm";

/**
 * Shared by `/admin/products/new` and `/admin/products/[slug]/edit` — the two
 * differ only in which action they post to and whether an `id` travels along.
 *
 * Every field falls back through the echoed submission first, so a validation
 * failure never costs the admin what they typed.
 */
export function ProductForm({
  categories,
  sections,
  product,
}: {
  categories: AdminCategory[];
  sections: SectionOption[];
  product?: AdminProduct;
}) {
  const editing = product !== undefined;
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    editing ? updateProductAction : createProduct,
    { error: null },
  );

  const form = useRef<HTMLFormElement>(null);
  useRestoreSelects(form, state);

  const sent = state.values;
  const field = (name: string, fallback: string | number | null | undefined) =>
    sent?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));

  const departments = categories.filter((c) => c.kind === "department");
  const types = categories.filter((c) => c.kind === "type");

  // Cents are the stored fact; the form talks in euros.
  const priceDefault = product ? (product.priceCents / 100).toFixed(2) : "";
  const imagesDefault = product ? product.images.join("\n") : "";
  const checked = (name: string, fallback: boolean) =>
    sent ? sent[name] !== undefined : fallback;

  return (
    <form ref={form} action={formAction} className="mt-8 flex max-w-xl flex-col gap-5">
      {editing && <input type="hidden" name="id" value={product.id} />}

      <label className="flex flex-col gap-2">
        <span className="text-label">Name</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={field("name", product?.name)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label">Slug</span>
        <input
          name="slug"
          type="text"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={field("slug", product?.slug)}
          aria-describedby="slug-hint"
          className={inputClass}
        />
        <span id="slug-hint" className="text-caption">
          Lowercase words joined by hyphens. This is the product&rsquo;s URL, so
          changing it on a live piece breaks existing links.
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label">Material</span>
        <input
          name="material"
          type="text"
          required
          defaultValue={field("material", product?.material)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label">Price (EUR)</span>
        <input
          name="price"
          type="number"
          min={0.01}
          step={0.01}
          required
          defaultValue={field("price", priceDefault)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label">Images</span>
        <textarea
          name="images"
          rows={4}
          required
          defaultValue={field("images", imagesDefault)}
          aria-describedby="images-hint"
          className={inputClass}
        />
        <span id="images-hint" className="text-caption">
          One URL per line. The first is the primary image; at least one is
          required.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-label">Department</span>
          <select
            name="departmentId"
            defaultValue={field("departmentId", product?.departmentId)}
            className={inputClass}
          >
            <option value="">— none —</option>
            {departments.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label">Product type</span>
          <select
            name="productTypeId"
            defaultValue={field("productTypeId", product?.productTypeId)}
            className={inputClass}
          >
            <option value="">— none —</option>
            {types.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-caption -mt-2">
        At least one of the two is required — it is what the piece names itself
        by on the storefront.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-label">Stock</span>
          <input
            name="quantity"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={field("quantity", product?.quantity ?? 0)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={field("sortOrder", product?.sortOrder ?? 0)}
            aria-describedby="sort-hint"
            className={inputClass}
          />
        </label>
      </div>
      <p id="sort-hint" className="text-caption -mt-2">
        Sort order ranks the curated homepage grids only.
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-label">Homepage section</span>
        <select
          name="section"
          defaultValue={field("section", product?.section)}
          className={inputClass}
        >
          <option value="">— none —</option>
          {sections.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-3">
        <input
          name="isNew"
          type="checkbox"
          defaultChecked={checked("isNew", product?.isNew ?? false)}
        />
        <span className="text-label">Show the &ldquo;New&rdquo; badge</span>
      </label>

      <p role="alert" className="min-h-[1.65em] text-sm">
        {state.error}
      </p>

      <div className="flex items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        <Link href="/admin/products" className="link-inline text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
