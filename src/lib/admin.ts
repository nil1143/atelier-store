import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { CATALOG_TAG, type CategoryKind, type HomepageSection } from "@/lib/catalog";

/**
 * The back office's view of the catalogue, read **uncached**.
 *
 * This is the same split `@/lib/orders` makes for the money path, for the same
 * reason: every exported query in `@/lib/catalog` opens with `"use cache"` +
 * `cacheLife("minutes")`, and an admin who saves a quantity on top of a number
 * that moved minutes ago has overwritten a sale. Admin also needs columns the
 * storefront type deliberately hides — raw `quantity`, `id`, `sortOrder`,
 * `section` and both category ids.
 *
 * Every write here ends with `revalidateTag(CATALOG_TAG, { expire: 0 })`. The
 * second argument is how long stale content may still be served, so a named
 * profile would show the next visitor the pre-edit catalogue; this is the same
 * call fulfilment makes after a stock decrement.
 */

// The two category axes are the same table joined twice, as in `@/lib/catalog`.
const department = alias(categories, "department");
const productType = alias(categories, "product_type");

const adminProductColumns = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  material: products.material,
  priceCents: products.priceCents,
  images: products.images,
  quantity: products.quantity,
  isNew: products.isNew,
  section: products.section,
  sortOrder: products.sortOrder,
  departmentId: products.departmentId,
  productTypeId: products.productTypeId,
  departmentName: department.name,
  productTypeName: productType.name,
};

const selectAdminProducts = () =>
  db
    .select(adminProductColumns)
    .from(products)
    .leftJoin(department, eq(products.departmentId, department.id))
    .leftJoin(productType, eq(products.productTypeId, productType.id));

export type AdminProduct = Awaited<ReturnType<typeof selectAdminProducts>>[number];

/** Every product, by name — the order someone looking for one scans in. */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  return selectAdminProducts().orderBy(asc(products.name));
}

export async function getAdminProduct(
  slug: string,
): Promise<AdminProduct | undefined> {
  const rows = await selectAdminProducts().where(eq(products.slug, slug)).limit(1);
  return rows[0];
}

export type AdminCategory = typeof categories.$inferSelect;

/** Both axes, grouped by axis then in the order the storefront shows them. */
export async function listAdminCategories(): Promise<AdminCategory[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.kind), asc(categories.sortOrder), asc(categories.name));
}

export type ProductInput = {
  slug: string;
  name: string;
  material: string;
  priceCents: number;
  images: string[];
  departmentId: number | null;
  productTypeId: number | null;
  quantity: number;
  isNew: boolean;
  section: HomepageSection | null;
  sortOrder: number;
};

export async function insertProduct(values: ProductInput): Promise<void> {
  await db.insert(products).values(values);
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

export async function updateProduct(
  id: number,
  values: ProductInput,
): Promise<void> {
  await db.update(products).set(values).where(eq(products.id, id));
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/**
 * Sets stock to a counted absolute figure, which is what a back office knows.
 *
 * Deliberately not an adjustment: a save that races a fulfilment decrement is
 * last-write-wins, and the admin's count is the one worth keeping. Fulfilment
 * remains the only path that *takes* stock, under its own guarded transaction.
 */
export async function setProductQuantity(
  slug: string,
  quantity: number,
): Promise<void> {
  await db.update(products).set({ quantity }).where(eq(products.slug, slug));
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

export type CategoryInput = {
  kind: CategoryKind;
  slug: string;
  name: string;
  tileImage: string | null;
  sortOrder: number;
};

export async function insertCategory(values: CategoryInput): Promise<void> {
  await db.insert(categories).values(values);
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

export async function updateCategory(
  id: number,
  values: CategoryInput,
): Promise<void> {
  await db.update(categories).set(values).where(eq(categories.id, id));
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/**
 * A `slug` collision — the one error a careful admin actually hits, so it is
 * reported in the form rather than thrown. Postgres 23505 is unique_violation;
 * the driver nests the original error, so both levels are checked.
 */
export function isUniqueViolation(error: unknown): boolean {
  const codeOf = (value: unknown) =>
    typeof value === "object" && value !== null
      ? (value as { code?: unknown }).code
      : undefined;

  if (codeOf(error) === "23505") return true;
  if (codeOf((error as { cause?: unknown } | null)?.cause) === "23505") return true;
  return error instanceof Error && error.message.includes("duplicate key value");
}
