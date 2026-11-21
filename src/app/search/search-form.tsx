"use client";

import Form from "next/form";
import { useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/icons";

/**
 * A plain GET form, so search works before hydration and every result page is
 * a shareable URL; `next/form` turns the submit into a client navigation.
 *
 * Reads the term from the URL rather than from a prop so the field already
 * holds it on a client navigation, while the results are still streaming.
 * Keyed on the term so the header's bare `/search` link clears it.
 */
export function SearchForm({ maxLength }: { maxLength: number }) {
  const q = useSearchParams().get("q") ?? "";
  return <SearchField key={q} defaultValue={q} maxLength={maxLength} />;
}

export function SearchField({
  defaultValue = "",
  maxLength,
}: {
  defaultValue?: string;
  maxLength: number;
}) {
  return (
    <Form action="/search" role="search" className="flex items-stretch gap-3">
      <label htmlFor="search-q" className="sr-only">
        Search the collection
      </label>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <SearchIcon />
        </span>
        <input
          id="search-q"
          type="search"
          name="q"
          defaultValue={defaultValue}
          maxLength={maxLength}
          placeholder="Bags, cashmere, loafers…"
          autoComplete="off"
          enterKeyHint="search"
          autoFocus={defaultValue === ""}
          className="border-field w-full py-3 pr-3 pl-11 text-base"
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </Form>
  );
}
