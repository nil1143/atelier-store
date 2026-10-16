import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCategories, type Category, type CategoryKind } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Collections — Atelier",
  description:
    "Every Atelier collection: the women's and men's departments, and the leather goods, shoes, jewellery and accessories that run across both.",
};

/**
 * The two axes, in the order the page presents them. The departments are two
 * tiles, so they get their own column count rather than sitting in a
 * four-column row with half of it empty.
 */
const groups: {
  kind: CategoryKind;
  label: string;
  blurb: string;
  columns: string;
}[] = [
  {
    kind: "department",
    label: "Departments",
    blurb: "The full season, cut for the way it is worn.",
    columns: "grid-cols-2",
  },
  {
    kind: "type",
    label: "By category",
    blurb: "Pieces that run across both departments.",
    columns: "grid-cols-2 lg:grid-cols-4",
  },
];

function CategoryTile({ category }: { category: Category }) {
  return (
    <Link href={`/collections/${category.slug}`} className="card group">
      <div className="card-media">
        {category.image ? (
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        ) : (
          // No tile art: a typographic tile rather than an empty frame. It
          // repeats the name below it, so it is decorative to a screen reader.
          <span
            aria-hidden
            className="font-display absolute inset-0 flex items-center justify-center p-4 text-center text-2xl text-muted md:text-3xl"
          >
            {category.name}
          </span>
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-xl md:text-2xl">{category.name}</span>
        <span className="text-label text-muted transition-colors group-hover:text-foreground">
          Shop
        </span>
      </div>
    </Link>
  );
}

export default async function CollectionsPage() {
  const categories = await getCategories();

  return (
    <div className="container-page pt-6 pb-16 md:pt-10 md:pb-24">
      <nav aria-label="Breadcrumb" className="mb-6 md:mb-10">
        <ol className="text-label flex flex-wrap items-center gap-x-2 text-muted">
          <li>
            <Link href="/" className="link-nav">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            Collections
          </li>
        </ol>
      </nav>

      <div className="mb-8 max-w-xl md:mb-12">
        <p className="text-label mb-3 text-muted">Autumn–Winter 2026</p>
        <h1 className="text-heading">Collections</h1>
        <p className="mt-4 text-muted">
          Two departments and the categories that cross them. Start wherever you like —
          every piece is cut and finished in Italy, in small runs.
        </p>
      </div>

      {groups.map(({ kind, label, blurb, columns }) => {
        const inGroup = categories.filter((c) => c.kind === kind);
        if (inGroup.length === 0) return null;

        return (
          <section key={kind} className="border-t border-line pt-6 first-of-type:border-t-0 first-of-type:pt-0 md:pt-10 md:first-of-type:pt-0">
            <div className="mb-6 md:mb-8">
              <h2 className="text-label">{label}</h2>
              <p className="mt-2 text-muted">{blurb}</p>
            </div>
            <ul className={`mb-10 grid gap-x-3 gap-y-10 md:mb-14 lg:gap-x-4 ${columns}`}>
              {inGroup.map((c) => (
                <li key={c.slug}>
                  <CategoryTile category={c} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="border-t border-line pt-6 text-muted">
        Looking for what has just landed?{" "}
        <Link href="/collections/new" className="link-inline">
          See the new arrivals
        </Link>
        .
      </p>
    </div>
  );
}
