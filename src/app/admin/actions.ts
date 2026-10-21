"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  insertCategory,
  insertProduct,
  isUniqueViolation,
  setProductQuantity,
  updateCategory,
  updateProduct,
  type CategoryInput,
  type ProductInput,
} from "@/lib/admin";
import {
  categoryKinds,
  homepageSections,
  type CategoryKind,
  type HomepageSection,
} from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

/**
 * Every action here opens with `requireAdmin`, before it reads the form and
 * before any database call. A Server Action is its own entry point — the
 * page's check does not protect it, and `src/proxy.ts` only looks for a
 * session cookie. `requireAdmin` redirects a signed-out caller and 404s a
 * signed-in non-admin, so both fail closed.
 *
 * `revalidatePath` on the admin route it affects is separate from the
 * `revalidateTag(CATALOG_TAG)` the data layer does: the tag expires the cached
 * *storefront*, while these pages read uncached and it is the client router
 * cache that would otherwise redisplay the pre-save row.
 *
 * Validation below mirrors the database's own constraints rather than leaving
 * them to produce an unreadable failure: `products_images_not_empty`,
 * `products_has_category`, `products_quantity_non_negative` and the unique
 * `slug` indexes are each represented.
 */

/**
 * React resets the form after its action runs, so every field the admin typed
 * is echoed back here and the form components put it back. Each failure is a
 * fresh object, which is what the effect that restores the selects keys on.
 */
export type AdminFormState = {
  error: string | null;
  values?: Record<string, string>;
};

/** A validation or conflict failure, with everything typed handed back. */
function fail(formData: FormData, error: string): AdminFormState {
  return { error, values: echo(formData) };
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Every text field, echoed back verbatim so nothing typed is lost on error. */
function echo(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") values[key] = value;
  }
  return values;
}

/** A non-negative integer, or null when the field is not one. */
function wholeNumber(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isSafeInteger(n) ? n : null;
}

/** An optional foreign key from a `<select>` whose empty value means none. */
function optionalId(raw: string): number | null {
  return raw === "" ? null : wholeNumber(raw);
}

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function parseProduct(formData: FormData): Parsed<ProductInput> {
  const slug = text(formData, "slug");
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Slug must be lowercase words joined by hyphens." };
  }

  const name = text(formData, "name");
  const material = text(formData, "material");
  if (!name || !material) {
    return { ok: false, error: "Name and material are both required." };
  }

  const euros = Number.parseFloat(text(formData, "price"));
  if (!Number.isFinite(euros) || euros <= 0) {
    return { ok: false, error: "Price must be a positive amount in euros." };
  }

  // `products_images_not_empty`: the catalog layer and every card treat
  // `images[0]` as a safe access, so an empty list cannot be allowed through.
  const images = text(formData, "images")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (images.length === 0) {
    return { ok: false, error: "Add at least one image URL, one per line." };
  }

  const departmentId = optionalId(text(formData, "departmentId"));
  const productTypeId = optionalId(text(formData, "productTypeId"));
  // `products_has_category`: this is what makes the storefront's
  // "most specific category wins" label rule total.
  if (departmentId === null && productTypeId === null) {
    return { ok: false, error: "Choose a department, a product type, or both." };
  }

  const quantity = wholeNumber(text(formData, "quantity"));
  if (quantity === null) {
    return { ok: false, error: "Stock must be a whole number, zero or more." };
  }

  const sortOrder = wholeNumber(text(formData, "sortOrder") || "0");
  if (sortOrder === null) {
    return { ok: false, error: "Sort order must be a whole number, zero or more." };
  }

  const rawSection = text(formData, "section");
  if (rawSection !== "" && !homepageSections.includes(rawSection as HomepageSection)) {
    return { ok: false, error: "That homepage section does not exist." };
  }

  return {
    ok: true,
    value: {
      slug,
      name,
      material,
      priceCents: Math.round(euros * 100),
      images,
      departmentId,
      productTypeId,
      quantity,
      isNew: formData.get("isNew") !== null,
      section: rawSection === "" ? null : (rawSection as HomepageSection),
      sortOrder,
    },
  };
}

export async function createProduct(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/products/new");

  const parsed = parseProduct(formData);
  if (!parsed.ok) return fail(formData, parsed.error);

  try {
    await insertProduct(parsed.value);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(formData, "That slug is already taken.");
    }
    throw error;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/products");

  const id = wholeNumber(text(formData, "id"));
  if (id === null) return fail(formData, "Unknown product.");

  const parsed = parseProduct(formData);
  if (!parsed.ok) return fail(formData, parsed.error);

  try {
    await updateProduct(id, parsed.value);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(formData, "That slug is already taken.");
    }
    throw error;
  }

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

/**
 * The inline stock form on the products list. It has nowhere to show an error,
 * so it validates and returns without writing — the same shape as the cart
 * actions. The input is `type="number" min={0} step={1} required`, so this is
 * a last line of defence rather than how a bad value is normally caught.
 */
export async function updateStock(formData: FormData): Promise<void> {
  await requireAdmin("/admin/products");

  const slug = text(formData, "slug");
  const quantity = wholeNumber(text(formData, "quantity"));
  if (!slug || quantity === null) return;

  await setProductQuantity(slug, quantity);
  revalidatePath("/admin/products");
}

function parseCategory(formData: FormData): Parsed<CategoryInput> {
  const slug = text(formData, "slug");
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, error: "Slug must be lowercase words joined by hyphens." };
  }

  const name = text(formData, "name");
  if (!name) return { ok: false, error: "Name is required." };

  const rawKind = text(formData, "kind");
  if (!categoryKinds.includes(rawKind as CategoryKind)) {
    return { ok: false, error: "Choose whether this is a department or a type." };
  }

  const sortOrder = wholeNumber(text(formData, "sortOrder") || "0");
  if (sortOrder === null) {
    return { ok: false, error: "Sort order must be a whole number, zero or more." };
  }

  const tileImage = text(formData, "tileImage");

  return {
    ok: true,
    value: {
      kind: rawKind as CategoryKind,
      slug,
      name,
      // Null rather than "": a category with no tile art gets no homepage tile.
      tileImage: tileImage === "" ? null : tileImage,
      sortOrder,
    },
  };
}

export async function createCategory(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/categories");

  const parsed = parseCategory(formData);
  if (!parsed.ok) return fail(formData, parsed.error);

  try {
    await insertCategory(parsed.value);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(formData, "That slug is already taken.");
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin("/admin/categories");

  const id = wholeNumber(text(formData, "id"));
  if (id === null) return fail(formData, "Unknown category.");

  const parsed = parseCategory(formData);
  if (!parsed.ok) return fail(formData, parsed.error);

  try {
    await updateCategory(id, parsed.value);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(formData, "That slug is already taken.");
    }
    throw error;
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}
