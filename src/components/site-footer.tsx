import Link from "next/link";

const columns = [
  {
    title: "Shop",
    links: [
      { href: "/collections/new", label: "New arrivals" },
      { href: "/collections", label: "Collections" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Client services",
    links: [
      { href: "/account", label: "Your account" },
      { href: "/cart", label: "Shopping bag" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-subtle">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(2,1fr)] md:gap-8">
        <div className="flex flex-col gap-4">
          <p className="font-display text-xl uppercase tracking-[0.38em]">Atelier</p>
          <p className="max-w-xs text-muted">
            Ready-to-wear, leather goods and jewellery, made in small runs by workshops we know by name.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-4">
            <h2 className="text-label">{col.title}</h2>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="container-page text-caption py-6">© 2026 Atelier. All rights reserved.</p>
      </div>
    </footer>
  );
}
