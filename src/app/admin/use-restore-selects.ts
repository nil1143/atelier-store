"use client";

import { useEffect, type RefObject } from "react";
import type { AdminFormState } from "./actions";

/**
 * Puts the echoed `<select>` values back after a rejected save.
 *
 * Text inputs and checkboxes come back on their own: React writes
 * `defaultValue` / `defaultChecked` as HTML attributes, which is exactly what
 * the native form reset React runs after an action restores. A `<select>` has
 * no such attribute on the client — React assigns the selection as a DOM
 * property — so the reset clears it and the category the admin picked would
 * vanish silently. This effect runs after that reset, from the same echoed
 * values, and is a no-op on the server-rendered (no-JS) path, where the
 * `selected` attribute is emitted correctly in the first place.
 */
export function useRestoreSelects(
  form: RefObject<HTMLFormElement | null>,
  state: AdminFormState,
) {
  useEffect(() => {
    const values = state.values;
    if (!form.current || !values) return;
    for (const select of form.current.querySelectorAll("select")) {
      const echoed = values[select.name];
      if (echoed !== undefined) select.value = echoed;
    }
  }, [form, state]);
}
