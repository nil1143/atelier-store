import { getCartItemCount } from "@/lib/cart";

/**
 * The header's bag count. Reads the cart cookie, so it is request-scoped and
 * the layout renders it inside a `<Suspense>` boundary — that is what keeps
 * every other page's shell statically prerenderable.
 */
export async function BagCount() {
  const count = await getCartItemCount();
  if (count === 0) return null;

  return (
    <span className="absolute right-0 top-0.5 min-w-4 rounded-full bg-foreground px-1 text-center text-[0.5625rem] leading-4 text-canvas tabular-nums">
      {count}
    </span>
  );
}
