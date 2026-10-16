import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

// Imported dynamically, after dotenv has run: `src/db/index.ts` reads
// env.DATABASE_URL at module load, and src/lib/env.ts throws when it is unset.
const { db } = await import("./index");
const { categories, products } = await import("./schema");

const unsplash = (id: string, params = "w=1600") =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&${params}`;

/**
 * Three framings of one photograph, standing in for real alternate shots until
 * the pieces have their own photography. The first view is the primary.
 *
 * A crop only takes effect when w and h force an aspect ratio different from
 * the source, so each alternate view asks for a different ratio. `crop=top` on
 * its own is silently ignored and would return the same photo three times.
 */
const views = (id: string) => [
  unsplash(id),
  unsplash(id, "w=1400&h=1400&crop=entropy"),
  unsplash(id, "w=1600&h=1000&crop=entropy"),
];

/** Quantities chosen to reproduce the three display states exactly. */
const SOLD_OUT = 0;
const LOW = 2;
const PLENTY = 12;

type CategorySeed = {
  slug: string;
  kind: "department" | "type";
  name: string;
  tileImage: string | null;
  sortOrder: number;
};

/** `sortOrder` fixes the homepage tile order, which was array order before. */
const categorySeed: CategorySeed[] = [
  { slug: "women", kind: "department", name: "Women", tileImage: unsplash("1581044777550-4cfa60707c03"), sortOrder: 0 },
  { slug: "men", kind: "department", name: "Men", tileImage: unsplash("1520975954732-35dd22299614"), sortOrder: 1 },
  { slug: "shoes", kind: "type", name: "Shoes", tileImage: unsplash("1543163521-1bf539c55dd2"), sortOrder: 2 },
  { slug: "jewellery", kind: "type", name: "Jewellery", tileImage: unsplash("1515562141207-7a88fb7ce338"), sortOrder: 3 },
  { slug: "bags", kind: "type", name: "Bags", tileImage: null, sortOrder: 4 },
  { slug: "accessories", kind: "type", name: "Accessories", tileImage: null, sortOrder: 5 },
];

type ProductSeed = {
  slug: string;
  name: string;
  material: string;
  priceCents: number;
  photoId: string;
  department: string | null;
  productType: string | null;
  quantity: number;
  isNew: boolean;
  section: "new-arrivals" | "leather-goods";
  sortOrder: number;
};

const productSeed: ProductSeed[] = [
  {
    slug: "camel-wrap-coat",
    name: "Belted wrap coat",
    material: "Double-faced wool and cashmere",
    priceCents: 290000,
    photoId: "1539533018447-63fcce2678e3",
    department: "women",
    productType: null,
    quantity: PLENTY,
    isNew: true,
    section: "new-arrivals",
    sortOrder: 0,
  },
  {
    slug: "leather-biker-jacket",
    name: "Biker jacket",
    material: "Lambskin leather",
    priceCents: 320000,
    photoId: "1551028719-00167b16eac5",
    department: "women",
    productType: null,
    quantity: LOW,
    isNew: true,
    section: "new-arrivals",
    sortOrder: 1,
  },
  {
    slug: "silk-pleated-trousers",
    name: "Pleated trousers",
    material: "Washed silk crêpe",
    priceCents: 98000,
    photoId: "1594633312681-425c7b97ccd1",
    department: "women",
    productType: null,
    quantity: PLENTY,
    isNew: true,
    section: "new-arrivals",
    sortOrder: 2,
  },
  {
    slug: "cognac-oxford-brogues",
    name: "Oxford brogues",
    material: "Hand-burnished calfskin",
    priceCents: 78000,
    photoId: "1614252235316-8c857d38b5f4",
    department: "men",
    productType: "shoes",
    quantity: PLENTY,
    isNew: false,
    section: "new-arrivals",
    sortOrder: 3,
  },
  {
    slug: "coral-top-handle-bag",
    name: "Top-handle bag",
    material: "Smooth calfskin, palladium hardware",
    priceCents: 245000,
    photoId: "1584917865442-de89df76afd3",
    department: "women",
    productType: "bags",
    quantity: LOW,
    isNew: false,
    section: "leather-goods",
    sortOrder: 0,
  },
  {
    slug: "woven-top-handle-bag",
    name: "Woven top-handle bag",
    material: "Hand-woven leather",
    priceCents: 198000,
    photoId: "1590874103328-eac38a683ce7",
    department: "women",
    productType: "bags",
    quantity: SOLD_OUT,
    isNew: true,
    section: "leather-goods",
    sortOrder: 1,
  },
  {
    slug: "round-metal-sunglasses",
    name: "Round sunglasses",
    material: "Gold-tone metal, green lenses",
    priceCents: 39000,
    photoId: "1511499767150-a48a237f0083",
    department: null,
    productType: "accessories",
    quantity: PLENTY,
    isNew: false,
    section: "leather-goods",
    sortOrder: 2,
  },
  {
    slug: "pave-link-bracelet",
    name: "Pavé link bracelet",
    material: "18k gold vermeil",
    priceCents: 115000,
    photoId: "1611591437281-460bfbe1220a",
    department: null,
    productType: "jewellery",
    quantity: PLENTY,
    isNew: false,
    section: "leather-goods",
    sortOrder: 3,
  },
];

/**
 * Idempotent: every write upserts on `slug`, so re-running corrects drift
 * rather than duplicating. That is what makes this safe on the Neon HTTP
 * driver, which has no transactions — a half-finished seed is fixed by
 * running it again.
 */
async function seed() {
  for (const category of categorySeed) {
    await db
      .insert(categories)
      .values(category)
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          kind: category.kind,
          name: category.name,
          tileImage: category.tileImage,
          sortOrder: category.sortOrder,
        },
      });
  }
  console.log(`seeded ${categorySeed.length} categories`);

  const rows = await db
    .select({ id: categories.id, slug: categories.slug, kind: categories.kind })
    .from(categories);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  /**
   * A plain foreign key cannot check that `department_id` points at a
   * `kind = 'department'` row, so the seeder is where that invariant is kept.
   */
  const resolve = (
    slug: string | null,
    kind: "department" | "type",
    productSlug: string,
  ) => {
    if (slug === null) return null;
    const row = bySlug.get(slug);
    if (!row) {
      throw new Error(`${productSlug}: no category "${slug}"`);
    }
    if (row.kind !== kind) {
      throw new Error(
        `${productSlug}: category "${slug}" is kind "${row.kind}", expected "${kind}"`,
      );
    }
    return row.id;
  };

  for (const product of productSeed) {
    const values = {
      slug: product.slug,
      name: product.name,
      material: product.material,
      priceCents: product.priceCents,
      images: views(product.photoId),
      departmentId: resolve(product.department, "department", product.slug),
      productTypeId: resolve(product.productType, "type", product.slug),
      quantity: product.quantity,
      isNew: product.isNew,
      section: product.section,
      sortOrder: product.sortOrder,
    };

    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: values });
  }
  console.log(`seeded ${productSeed.length} products`);
}

await seed();
