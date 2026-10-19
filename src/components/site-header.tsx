"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AccountIcon, BagIcon, CloseIcon, MenuIcon, SearchIcon } from "./icons";

const navLinks = [
  { href: "/collections/women", label: "Women" },
  { href: "/collections/men", label: "Men" },
  { href: "/collections/bags", label: "Bags" },
  { href: "/collections/shoes", label: "Shoes" },
  { href: "/collections/jewellery", label: "Jewellery" },
];

/**
 * `bagCount` is rendered on the server and passed in: this is a Client
 * Component, so it cannot read the cart cookie itself.
 */
export function SiteHeader({ bagCount }: { bagCount?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="container-page grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-7">
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <nav aria-label="Primary" className="hidden gap-7 lg:flex">
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} className="link-nav">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <Link
          href="/"
          className="font-display text-[1.375rem] font-normal uppercase tracking-[0.38em] sm:text-[1.625rem]"
          aria-label="Atelier home"
          onClick={() => setOpen(false)}
        >
          Atelier
        </Link>

        <div className="flex items-center justify-end gap-1 sm:gap-3">
          <Link href="/search" className="hidden p-2 transition-opacity hover:opacity-55 sm:block" aria-label="Search">
            <SearchIcon />
          </Link>
          <Link href="/account" className="hidden p-2 transition-opacity hover:opacity-55 sm:block" aria-label="Account">
            <AccountIcon />
          </Link>
          {/* No aria-label: the name is composed from the contents so the
              count is part of it ("Shopping bag, 2"). */}
          <Link href="/cart" className="relative -mr-2 p-2 transition-opacity hover:opacity-55">
            <BagIcon />
            <span className="sr-only">Shopping bag</span>
            {bagCount}
          </Link>
        </div>
      </div>

      <nav
        id="mobile-menu"
        aria-label="Mobile"
        hidden={!open}
        className="border-t border-line lg:hidden"
      >
        <ul className="container-page flex flex-col py-4">
          {navLinks.map((l) => (
            <li key={l.href} className="border-b border-line last:border-b-0">
              <Link
                href={l.href}
                className="font-display block py-4 text-2xl"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li className="flex gap-6 pt-6">
            <Link href="/search" className="link-nav" onClick={() => setOpen(false)}>Search</Link>
            <Link href="/account" className="link-nav" onClick={() => setOpen(false)}>Account</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
