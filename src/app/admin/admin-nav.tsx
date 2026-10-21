import Link from "next/link";

const links = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
];

/**
 * Rendered *inside* each page's authenticated subtree, never from a layout:
 * `requireAdmin` 404s a non-admin, and a layout would still paint its nav
 * above that — telling them the admin area is there.
 */
export function AdminNav({ current }: { current?: string }) {
  return (
    <nav className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-4">
      <Link
        href="/admin"
        className="link-nav"
        aria-current={current === undefined ? "page" : undefined}
      >
        Overview
      </Link>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="link-nav"
          aria-current={current === l.href ? "page" : undefined}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
