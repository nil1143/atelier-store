import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Suspense } from "react";
import { BagCount } from "@/components/bag-count";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCategories } from "@/lib/catalog";
import { env } from "@/lib/env";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const description = "Ready-to-wear, leather goods and jewellery from Atelier.";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: "Atelier Store",
  description,
  openGraph: {
    type: "website",
    siteName: "Atelier Store",
    title: "Atelier Store",
    description,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cached ("use cache" + CATALOG_TAG), so it belongs to the static shell.
  const categories = (await getCategories()).map(({ slug, name }) => ({ slug, name }));

  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <p className="text-label bg-ink px-2 py-2 text-center text-[0.625rem] text-chalk">
          Demo · Stripe test mode · pay with 4242 4242 4242 4242, any name, any date, any CVC
        </p>
        <SiteHeader
          categories={categories}
          bagCount={
            <Suspense fallback={null}>
              <BagCount />
            </Suspense>
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
