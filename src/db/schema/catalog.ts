import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Categories are two orthogonal axes, not one list: `department` (women, men)
 * and `type` (bags, shoes, jewellery, accessories). A women's bag is both, so
 * `products` carries one nullable foreign key per axis.
 *
 * Both axes live in this single table because the nav and `/collections/[slug]`
 * are flat and already mix them — the homepage tiles are women, men, shoes and
 * jewellery. One table keeps slugs unique across both axes, which is what makes
 * that route unambiguous.
 */
export const categoryKind = pgEnum("category_kind", ["department", "type"]);

/** The two curated homepage grids. Membership follows neither axis nor isNew. */
export const homepageSection = pgEnum("homepage_section", [
  "new-arrivals",
  "leather-goods",
]);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    kind: categoryKind("kind").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    /** Homepage tile art. Null means the category gets no tile. */
    tileImage: text("tile_image"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("categories_kind_sort_idx").on(t.kind, t.sortOrder)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    material: text("material").notNull(),
    priceCents: integer("price_cents").notNull(),
    /** Ordered; the first entry is the primary image. */
    images: text("images").array().notNull(),
    departmentId: integer("department_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    productTypeId: integer("product_type_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    /** The stored stock fact. The three display states are derived from it. */
    quantity: integer("quantity").notNull().default(0),
    isNew: boolean("is_new").notNull().default(false),
    section: homepageSection("section"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("products_section_sort_idx").on(t.section, t.sortOrder),
    index("products_department_idx").on(t.departmentId),
    index("products_product_type_idx").on(t.productTypeId),
    // Keeps `images[0]` a safe access in the catalog layer and the components.
    check("products_images_not_empty", sql`array_length(${t.images}, 1) >= 1`),
    check("products_quantity_non_negative", sql`${t.quantity} >= 0`),
    // Makes the "most specific category wins" label rule total: every product
    // is guaranteed at least one category to name itself by.
    check(
      "products_has_category",
      sql`${t.departmentId} IS NOT NULL OR ${t.productTypeId} IS NOT NULL`,
    ),
  ],
);

// Two foreign keys target the same table, so each relation needs a name.
export const productsRelations = relations(products, ({ one }) => ({
  department: one(categories, {
    relationName: "productDepartment",
    fields: [products.departmentId],
    references: [categories.id],
  }),
  productType: one(categories, {
    relationName: "productType",
    fields: [products.productTypeId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  productsByDepartment: many(products, { relationName: "productDepartment" }),
  productsByType: many(products, { relationName: "productType" }),
}));
