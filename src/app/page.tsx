import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getCollectionTiles, getHomepageSection } from "@/lib/catalog";

// Editorial imagery, not catalog data: these belong to this page's layout and
// this is their only consumer.
const heroImage =
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1600";
const tailoringImages = [
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=1600",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1600",
] as const;
const atelierImage =
  "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=1600";

const services = [
  {
    title: "Complimentary delivery",
    body: "Every order ships free, signed for and wrapped in our recycled linen pouch.",
  },
  {
    title: "Thirty-day returns",
    body: "Changed your mind? Return unworn pieces within thirty days, collected from your door.",
  },
  {
    title: "Private appointments",
    body: "Book an hour with a client advisor in the Milan atelier or by video call.",
  },
];

export default async function Home() {
  const [newArrivals, leatherGoods, collections] = await Promise.all([
    getHomepageSection("new-arrivals"),
    getHomepageSection("leather-goods"),
    getCollectionTiles(),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative h-[82svh] min-h-[32rem] max-h-[60rem] overflow-hidden bg-ink">
        <Image
          src={heroImage}
          alt="A woman in a pale blue wool coat standing in a cathedral square"
          fill
          preload
          sizes="100vw"
          className="object-cover object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/30 to-ink/0" />
        <div className="container-page relative flex h-full flex-col justify-end pb-12 text-chalk md:pb-20">
          <p className="text-label mb-5">Autumn–Winter 2026</p>
          <h1 className="text-display max-w-[12ch]">The quiet season</h1>
          <p className="mt-5 max-w-md text-[0.9375rem] text-chalk/85">
            Soft tailoring, brushed wool and leather worn in. A collection cut for long walks and slow afternoons.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/collections/women" className="btn btn-light">
              Shop the collection
            </Link>
            <Link href="/campaign" className="btn btn-ghost text-chalk">
              View the campaign
            </Link>
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="pt-16 md:pt-24">
        <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <p className="text-label mb-3 text-muted">Just in</p>
            <h2 className="text-heading">New arrivals</h2>
          </div>
          <Link href="/collections/new" className="link-nav link-inline shrink-0">
            View all
          </Link>
        </div>
        <div className="product-grid">
          {newArrivals.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Tailoring campaign diptych */}
      <section className="section">
        <div className="container-page">
          <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {tailoringImages.map((src, i) => (
              <div key={src} className="relative aspect-[4/5] overflow-hidden bg-subtle">
                <Image
                  src={src}
                  alt={
                    i === 0
                      ? "A man in a navy two-piece suit walking past a glass facade"
                      : "Close-up of hands buttoning a charcoal suit jacket"
                  }
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center text-center md:mt-14">
            <p className="text-label mb-4 text-muted">Men</p>
            <h2 className="text-heading">Tailoring, recut</h2>
            <p className="mt-4 text-muted">
              Half-canvassed jackets with a softer shoulder, and trousers finished by hand in our workshop outside Naples.
            </p>
            <Link href="/collections/men" className="btn btn-secondary mt-8">
              Discover tailoring
            </Link>
          </div>
        </div>
      </section>

      {/* Shop by category */}
      <section className="border-t border-line pt-16 pb-16 md:pt-24 md:pb-24">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between gap-6 md:mb-12">
            <h2 className="text-heading">Shop by category</h2>
            <Link href="/collections" className="link-nav link-inline shrink-0">
              View all
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-10 lg:grid-cols-4 lg:gap-x-4">
            {collections.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="card group">
                  <div className="card-media">
                    <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-xl md:text-2xl">{c.name}</span>
                    <span className="text-label text-muted transition-colors group-hover:text-foreground">
                      Shop
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Editorial: the atelier */}
      <section className="grid bg-subtle md:grid-cols-2">
        <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[40rem]">
          <Image
            src={atelierImage}
            alt="Coats and knitwear hanging in a softly lit shop window"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex items-center px-4 py-16 sm:px-6 md:px-12 lg:px-20">
          <div className="max-w-md">
            <p className="text-label mb-4 text-muted">The house</p>
            <h2 className="text-heading">Made slowly, in rooms we know</h2>
            <p className="mt-6">
              Every coat passes through eleven pairs of hands before it reaches the rail. We work with four family workshops
              in Lombardy and Campania, most of them for more than twenty years.
            </p>
            <p className="mt-4 text-muted">
              Runs are small, so pieces sell out. When they do, we say so rather than remake them in a hurry.
            </p>
            <Link href="/atelier" className="btn btn-ghost mt-8">
              Inside the atelier
            </Link>
          </div>
        </div>
      </section>

      {/* Leather goods & accessories */}
      <section className="pt-16 md:pt-24">
        <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-12">
          <div>
            <p className="text-label mb-3 text-muted">Accessories</p>
            <h2 className="text-heading">Leather goods and finishing touches</h2>
          </div>
          <Link href="/collections/bags" className="link-nav link-inline shrink-0">
            View all
          </Link>
        </div>
        <div className="product-grid">
          {leatherGoods.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <ul className="container-page grid gap-10 md:grid-cols-3 md:gap-8">
          {services.map((s) => (
            <li key={s.title} className="border-t border-foreground pt-6">
              <h3 className="text-label">{s.title}</h3>
              <p className="mt-3 max-w-xs text-muted">{s.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
