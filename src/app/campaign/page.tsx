import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getHomepageSection } from "@/lib/catalog";
import { heroImage, tailoringImages } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "The quiet season — Atelier",
  description:
    "The Autumn–Winter 2026 campaign: soft tailoring, brushed wool and leather worn in, photographed on long walks and slow afternoons.",
};

const chapters = [
  {
    title: "Soft tailoring",
    body: "Half-canvassed jackets with the shoulder pad taken out, so the cloth falls from the body rather than sitting on it.",
  },
  {
    title: "Brushed wool",
    body: "Double-faced wool and cashmere, brushed by hand until the surface catches the light like felt.",
  },
  {
    title: "Leather worn in",
    body: "Lambskin and calf finished with oil rather than lacquer, so they darken and soften the more they are carried.",
  },
];

export default async function CampaignPage() {
  const looks = await getHomepageSection("new-arrivals");

  return (
    <>
      <section className="relative h-[82svh] min-h-[32rem] max-h-[60rem] overflow-hidden bg-ink">
        <Image
          src={heroImage.src}
          alt={heroImage.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/30 to-ink/0" />
        <div className="container-page relative flex h-full flex-col justify-end pb-12 text-chalk md:pb-20">
          <p className="text-label mb-5">The campaign · Autumn–Winter 2026</p>
          <h1 className="text-display max-w-[12ch]">The quiet season</h1>
        </div>
      </section>

      <section className="section">
        <div className="container-narrow">
          <p className="text-label mb-4 text-muted">A note on the season</p>
          <p className="font-display text-2xl leading-snug md:text-3xl">
            We photographed the collection the way it is meant to be worn: on long walks through cold squares, and on
            slow afternoons that run on into evening.
          </p>
          <p className="mt-6 text-muted">
            Nothing here is new for the sake of it. The coats are cut a little longer, the trousers a little higher, and
            the leather has been left to age before it reaches you.
          </p>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="container-page">
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {tailoringImages.map(({ src, alt }) => (
              <div key={src} className="relative aspect-[4/5] overflow-hidden bg-subtle">
                <Image src={src} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              </div>
            ))}
          </div>
          <ol className="mt-12 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-8">
            {chapters.map((c, i) => (
              <li key={c.title} className="border-t border-foreground pt-6">
                <p className="text-caption mb-2">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="text-label mb-3">{c.title}</h2>
                <p className="text-muted">{c.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {looks.length > 0 && (
        <section className="border-t border-line pt-16 md:pt-24">
          <div className="container-page mb-8 md:mb-12">
            <p className="text-label mb-3 text-muted">From the campaign</p>
            <h2 className="text-heading">Shop the looks</h2>
          </div>
          <div className="container-page">
            <div className="product-grid">
              {looks.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container-page flex flex-wrap justify-center gap-4">
          <Link href="/collections/women" className="btn btn-primary">
            Shop women
          </Link>
          <Link href="/collections/men" className="btn btn-secondary">
            Shop men
          </Link>
        </div>
      </section>
    </>
  );
}
