CREATE TYPE "public"."category_kind" AS ENUM('department', 'type');--> statement-breakpoint
CREATE TYPE "public"."homepage_section" AS ENUM('new-arrivals', 'leather-goods');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "category_kind" NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tile_image" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"material" text NOT NULL,
	"price_cents" integer NOT NULL,
	"images" text[] NOT NULL,
	"department_id" integer,
	"product_type_id" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"section" "homepage_section",
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_images_not_empty" CHECK (array_length("products"."images", 1) >= 1),
	CONSTRAINT "products_quantity_non_negative" CHECK ("products"."quantity" >= 0),
	CONSTRAINT "products_has_category" CHECK ("products"."department_id" IS NOT NULL OR "products"."product_type_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_department_id_categories_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_categories_id_fk" FOREIGN KEY ("product_type_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_kind_sort_idx" ON "categories" USING btree ("kind","sort_order");--> statement-breakpoint
CREATE INDEX "products_section_sort_idx" ON "products" USING btree ("section","sort_order");--> statement-breakpoint
CREATE INDEX "products_department_idx" ON "products" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "products_product_type_idx" ON "products" USING btree ("product_type_id");