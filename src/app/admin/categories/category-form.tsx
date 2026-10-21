"use client";

import { useActionState, useRef } from "react";
import type { AdminCategory } from "@/lib/admin";
import { useRestoreSelects } from "../use-restore-selects";
import { createCategory, updateCategoryAction, type AdminFormState } from "../actions";

const inputClass = "border-field w-full px-3 py-2.5 text-sm";

/**
 * The two category axes, handed down from the page rather than imported:
 * `@/lib/catalog` reaches the database and `cacheTag`, so a client component
 * cannot pull it in.
 */
export type KindOption = { value: string; label: string };

/**
 * Used twice on `/admin/categories`: once standalone to add a category, and
 * once per row to edit one in place. Passing a `category` switches both the
 * action and the submit label.
 */
export function CategoryForm({
  kinds,
  category,
}: {
  kinds: KindOption[];
  category?: AdminCategory;
}) {
  const editing = category !== undefined;
  const [state, formAction, isPending] = useActionState<AdminFormState, FormData>(
    editing ? updateCategoryAction : createCategory,
    { error: null },
  );

  const form = useRef<HTMLFormElement>(null);
  useRestoreSelects(form, state);

  const sent = state.values;
  const field = (name: string, fallback: string | number | null | undefined) =>
    sent?.[name] ?? (fallback === null || fallback === undefined ? "" : String(fallback));

  return (
    <form ref={form} action={formAction} className="flex flex-col gap-4">
      {editing && <input type="hidden" name="id" value={category.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-label">Name</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={field("name", category?.name)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label">Slug</span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={field("slug", category?.slug)}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label">Axis</span>
          <select
            name="kind"
            required
            defaultValue={field("kind", category?.kind)}
            aria-describedby={editing ? undefined : "kind-hint"}
            className={inputClass}
          >
            {kinds.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-label">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={field("sortOrder", category?.sortOrder ?? 0)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-label">Tile image</span>
        <input
          name="tileImage"
          type="url"
          defaultValue={field("tileImage", category?.tileImage)}
          aria-describedby="tile-hint"
          className={inputClass}
        />
        <span id="tile-hint" className="text-caption">
          Optional. A category with no tile image gets no homepage tile.
        </span>
      </label>

      {!editing && (
        <p id="kind-hint" className="text-caption">
          Departments are Women and Men; types are Bags, Shoes and the rest.
          Slugs are unique across both, which is what keeps
          <code> /collections/[slug] </code> unambiguous.
        </p>
      )}

      <p role="alert" className="min-h-[1.65em] text-sm">
        {state.error}
      </p>

      <div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
          {isPending ? "Saving…" : editing ? "Save" : "Add category"}
        </button>
      </div>
    </form>
  );
}
