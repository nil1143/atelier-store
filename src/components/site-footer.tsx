import Link from "next/link";

const columns = [
  {
    title: "Client services",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns and exchanges" },
      { href: "/care", label: "Product care" },
    ],
  },
  {
    title: "The house",
    links: [
      { href: "/atelier", label: "Our atelier" },
      { href: "/craft", label: "Materials and craft" },
      { href: "/appointments", label: "Book an appointment" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of sale" },
      { href: "/cookies", label: "Cookie settings" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-subtle">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-8">
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
