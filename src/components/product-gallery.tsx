"use client";

import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/lib/catalog";

type ProductGalleryProps = {
  images: Product["images"];
  alt: string;
  isNew?: boolean;
};

/**
 * Every view is rendered at once and revealed with opacity, rather than
 * swapping one `src`. Swapping would start a fresh request on each click and
 * flash the empty frame; stacking costs two extra requests per page and makes
 * the change instant. Only the first view is given priority, so the others do
 * not compete with it for the largest contentful paint.
 */
export function ProductGallery({ images, alt, isNew }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start lg:gap-4">
      <div className="card-media min-w-0 flex-1">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={i === active ? alt : ""}
            fill
            {...(i === 0
              ? ({ loading: "eager", fetchPriority: "high" } as const)
              : {})}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className={`transition-opacity duration-500 ${
              i === active ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {isNew && (
          <span className="text-label absolute left-4 top-4 z-10 bg-chalk px-2 py-0.5 text-[0.625rem] text-ink">
            New
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul aria-label="Product views" className="flex shrink-0 gap-3 lg:flex-col lg:gap-4">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                aria-label={`Show view ${i + 1} of ${images.length}`}
                className="card-media gallery-thumb"
              >
                <Image src={src} alt="" fill sizes="72px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
