import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife } from "next/cache";
import { db } from "@/db";
import {
  categories,
  products,
  type categoryKind,
  type homepageSection,
} from "@/db/schema";

// The two category axes are the same table joined twice, so each needs an alias.
const department = alias(categories, "department");
const productType = alias(categories, "product_type");

export type HomepageSection = (typeof homepageSection.enumValues)[number];

export type StockState = "in-stock" | "low-stock" | "sold-out";

export type Product = {
  slug: string;
  name: string;
  material: string;
  priceCents: number;
  images: readonly [string, ...string[]];
  /** The most specific category: product type if it has one, else department. */
  categorySlug: string;
  categoryName: string;
  stock: StockState;
  isNew: boolean;
};

export type CollectionTile = {
  slug: string;
  name: string;
  image: string;
};

export const stockLabels: Record<StockState, string> = {
  "in-stock": "In stock",
  "low-stock": "Only a few left",
  "sold-out": "Sold out",
};

/** At or below this many units, the storefront says "Only a few left". */
const LOW_STOCK_THRESHOLD = 3;

const stockStateFor = (quantity: number): StockState => {
  if (quantity === 0) return "sold-out";
  if (quantity <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
};

const priceFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatPrice = (cents: number) => priceFormat.format(cents / 100);

/**
 * The columns every product query selects. Both category axes are joined, and
 * the mapper below picks the more specific one.
 */
const productColumns = {
  slug: products.slug,
  name: products.name,
  material: products.material,
  priceCents: products.priceCents,
  images: products.images,
  quantity: products.quantity,
  isNew: products.isNew,
  departmentSlug: department.slug,
  departmentName: department.name,
  productTypeSlug: productType.slug,
  productTypeName: productType.name,
};

const selectProducts = () =>
  db
    .select(productColumns)
    .from(products)
    .leftJoin(department, eq(products.departmentId, department.id))
    .leftJoin(productType, eq(products.productTypeId, productType.id));

type ProductRow = Awaited<ReturnType<typeof selectProducts>>[number];

/**
 * Turns a row into the shape the components consume, doing the three
 * derivations in one place: stock state from quantity, the most-specific
 * category, and the non-empty image tuple.
 *
 * Both derivations that can fail are guarded by database check constraints
 * (`products_images_not_empty`, `products_has_category`), so a throw here means
 * the data was written around them — loud is better than a blank card.
 */
function toProduct(row: ProductRow): Product {
  const [primaryImage, ...otherImages] = row.images;
  if (primaryImage === undefined) {
    throw new Error(`Product "${row.slug}" has no images`);
  }

  const categorySlug = row.productTypeSlug ?? row.departmentSlug;
  const categoryName = row.productTypeName ?? row.departmentName;
  if (categorySlug === null || categoryName === null) {
    throw new Error(`Product "${row.slug}" has no category`);
  }

  return {
    slug: row.slug,
    name: row.name,
    material: row.material,
    priceCents: row.priceCents,
    images: [primaryImage, ...otherImages],
    categorySlug,
    categoryName,
    stock: stockStateFor(row.quantity),
    isNew: row.isNew,
  };
}

/**
 * `cacheLife("minutes")` rather than the default: `quantity` changes, and a
 * stale "In stock" badge is a real defect. Without `use cache` these reads
 * would block the prerender under `cacheComponents`.
 */
export async function getHomepageSection(
  section: HomepageSection,
): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");

  const rows = await selectProducts()
    .where(eq(products.section, section))
    .orderBy(products.sortOrder);

  return rows.map(toProduct);
}

/** How many of the newest pieces the New Arrivals page lists. */
const NEW_ARRIVALS_LIMIT = 24;

/**
 * The newest pieces by the date they entered the catalogue, which is the fact
 * `isNew` and the `new-arrivals` homepage section only approximate — the badge
 * is set by hand and that section is curated. `slug` breaks ties so a reseed
 * that lands several rows on the same timestamp still paginates predictably.
 */
export async function getNewArrivals(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");

  const rows = await selectProducts()
    .orderBy(desc(products.createdAt), products.slug)
    .limit(NEW_ARRIVALS_LIMIT);

  return rows.map(toProduct);
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  "use cache";
  cacheLife("minutes");

  const rows = await selectProducts().where(eq(products.slug, slug)).limit(1);
  const row = rows[0];

  return row ? toProduct(row) : undefined;
}

/** Drives `generateStaticParams`, which must return at least one param. */
export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");

  const rows = await db
    .select({ slug: products.slug })
    .from(products)
    .orderBy(products.slug);

  return rows.map((r) => r.slug);
}

/**
 * Which axis a category sits on: `department` (women, men) or `type` (bags,
 * shoes, …). The `/collections` index groups by it; nothing else needs it.
 */
export type CategoryKind = (typeof categoryKind.enumValues)[number];

export type Category = {
  slug: string;
  name: string;
  kind: CategoryKind;
  /** Tile art, or null for a category that has been given none. */
  image: string | null;
};

const categoryColumns = {
  slug: categories.slug,
  name: categories.name,
  kind: categories.kind,
  image: categories.tileImage,
};

/**
 * Slugs are unique across both category axes, so a slug identifies one
 * category without knowing which axis it sits on.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<Category | undefined> {
  "use cache";
  cacheLife("minutes");

  const rows = await db
    .select(categoryColumns)
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  return rows[0];
}

/**
 * Everything filed under one category, on whichever axis it belongs to: a
 * department slug matches `departmentId`, a type slug matches `productTypeId`.
 * Matching both columns keeps the caller from having to know the axis.
 *
 * Newest first, with `slug` as the tie-break, for the same reason
 * `getNewArrivals` orders that way — `sortOrder` only ranks the curated
 * homepage grids and is not meaningful across a whole category.
 */
export async function getProductsByCategory(slug: string): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");

  const rows = await selectProducts()
    .where(or(eq(department.slug, slug), eq(productType.slug, slug)))
    .orderBy(desc(products.createdAt), products.slug);

  return rows.map(toProduct);
}

/**
 * Every category, both axes, in `sortOrder` — the order the storefront has
 * always shown them in. The single source of truth for listing categories.
 */
export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");

  return db.select(categoryColumns).from(categories).orderBy(categories.sortOrder);
}

/** Homepage tiles: the subset of categories given tile art, in `sortOrder`. */
export async function getCollectionTiles(): Promise<CollectionTile[]> {
  "use cache";
  cacheLife("minutes");

  const all = await getCategories();

  return all.flatMap((c) =>
    c.image === null ? [] : [{ slug: c.slug, name: c.name, image: c.image }],
  );
}

/** Drives `generateStaticParams`, which must return at least one param. */
export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheLife("minutes");

  const all = await getCategories();

  return all.map((c) => c.slug);
}
