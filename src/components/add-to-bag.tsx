import { addToCart } from "@/app/cart/actions";

/**
 * A plain form, so the PDP stays a Server Component and still prerenders — and
 * adding to the bag works with JavaScript off. One tap adds one unit; the bag
 * page is where quantities are edited.
 */
export function AddToBag({ slug, soldOut }: { slug: string; soldOut: boolean }) {
  return (
    <form action={addToCart} className="mt-8">
      <input type="hidden" name="slug" value={slug} />
      <button type="submit" className="btn btn-primary w-full" disabled={soldOut}>
        {soldOut ? "Sold out" : "Add to bag"}
      </button>
    </form>
  );
}
