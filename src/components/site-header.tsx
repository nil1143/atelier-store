"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccountIcon, BagIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";

/**
 * The slice of a catalogue category the menu needs. Declared here rather than
 * imported: a Client Component may not import `@/lib/catalog`.
 */
export type NavCategory = { slug: string; name: string };

// 18px icons and tighter padding below `sm`: at 320px each side column of the
// centred-logo grid is ~90px, and three 20px icons at p-1.5 did not fit.
const iconLink = "p-1 transition-opacity hover:opacity-55 max-sm:[&_svg]:size-[18px] sm:p-2";

/**
 * `bagCount` is rendered on the server and passed in: this is a Client
 * Component, so it cannot read the cart cookie itself. `categories` comes from
 * the cached `getCategories()` in the root layout for the same reason.
 */
export function SiteHeader({
  bagCount,
  categories,
}: {
  bagCount?: ReactNode;
  categories: NavCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [panelMaxHeight, setPanelMaxHeight] = useState<number>();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // The panel overlays the page instead of pushing it down, so the page behind
  // it is locked. Locking also pins the header where it is (below the demo
  // banner at the top of the page), which is what lets the panel's height be
  // measured once: viewport minus the header's bottom edge. The scrollbar's
  // width is padded back so desktop content does not shift sideways.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const measure = () => {
      const bottom = headerRef.current?.getBoundingClientRect().bottom ?? 0;
      setPanelMaxHeight(window.innerHeight - bottom);
    };
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = "hidden";
    root.style.paddingRight = `${scrollbar}px`;
    measure();
    window.addEventListener("resize", measure);
    return () => {
      root.style.overflow = "";
      root.style.paddingRight = "";
      window.removeEventListener("resize", measure);
    };
  }, [open]);

  return (
    <>
    {/* Scrim: dims the page under the open menu and closes it on click. The
        header (z-50 in .nav) sits above it. */}
    {open && (
      <div className="fixed inset-0 z-40 bg-ink/40" aria-hidden="true" onClick={close} />
    )}
    <header ref={headerRef} className="nav">
      <div className="container-page grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
        <div className="flex items-center">
          {/* Named by its visible "Menu" text; aria-expanded carries the state. */}
          <button
            ref={toggleRef}
            type="button"
            className="-ml-1.5 flex items-center gap-1.5 p-1.5 transition-opacity hover:opacity-55 sm:-ml-2 sm:gap-2.5 sm:p-2"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
            <span className="text-label">Menu</span>
          </button>
        </div>

        <Link
          href="/"
          className="font-display text-[1rem] font-normal uppercase tracking-[0.26em] sm:text-[1.625rem] sm:tracking-[0.38em]"
          aria-label="Atelier home"
          onClick={close}
        >
          Atelier
        </Link>

        <div className="flex items-center justify-end sm:gap-3">
          <Link href="/search" className={iconLink} aria-label="Search" onClick={close}>
            <SearchIcon />
          </Link>
          <Link href="/account" className={iconLink} aria-label="Account" onClick={close}>
            <AccountIcon />
          </Link>
          {/* No aria-label: the name is composed from the contents so the
              count is part of it ("Shopping bag, 2"). */}
          <Link
            href="/cart"
            className={`relative -mr-1.5 sm:-mr-2 ${iconLink}`}
            onClick={close}
          >
            <BagIcon />
            <span className="sr-only">Shopping bag</span>
            {bagCount}
          </Link>
        </div>
      </div>

      {/* Absolutely positioned under the bar, so opening it moves nothing on
          the page; scrolls on its own once the catalogue outgrows the space. */}
      <nav
        id="site-menu"
        aria-label="Categories"
        hidden={!open}
        style={{ maxHeight: panelMaxHeight }}
        className="absolute inset-x-0 top-full overflow-y-auto overscroll-contain border-y border-line bg-canvas"
      >
        <ul className="container-page grid py-4 sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.slug} className="border-b border-line max-sm:last:border-b-0">
              <Link
                href={`/collections/${c.slug}`}
                className="font-display block py-4 text-2xl"
                onClick={close}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
    </>
  );
}
