import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { getCategorySlugs, getProductSlugs } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProductSlugs(), getCategorySlugs()]);

  return [
    "/",
    "/collections",
    "/collections/new",
    "/campaign",
    "/atelier",
    ...categories.map((slug) => `/collections/${slug}`),
    ...products.map((slug) => `/products/${slug}`),
  ].map((path) => ({ url: `${env.APP_URL}${path === "/" ? "" : path}` }));
}
