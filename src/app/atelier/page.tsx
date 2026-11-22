import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { atelierImage, tailoringImages } from "@/lib/editorial";

export const metadata: Metadata = {
  title: "The atelier — Atelier",
  description:
    "How an Atelier piece is made: eleven pairs of hands, four family workshops in Lombardy and Campania, and runs small enough to know each one.",
};

const steps = [
  { title: "Pattern", body: "Each style starts as a paper pattern drafted by hand, then graded size by size." },
  { title: "Cutting", body: "Cloth is laid out and cut a few pieces at a time, so the grain runs true on every panel." },
  { title: "Canvassing", body: "Jackets and coats are half-canvassed and pad-stitched, so the chest shapes itself to the wearer." },
  { title: "Hand-finishing", body: "Buttonholes, collars and linings are finished by hand in our workshop outside Naples." },
  { title: "Pressing", body: "Every seam is pressed between stages, not just at the end — it is how a garment holds its line." },
  { title: "Inspection", body: "A final check against the original pattern before a piece is labelled and sent to the rail." },
];

const materials = [
  { title: "Wool and cashmere", body: "Double-faced and brushed, woven in Biella for the coats and tailoring." },
  { title: "Leather", body: "Lambskin and calf, tanned slowly and finished with oil so it softens with wear." },
  { title: "Silk", body: "Heavy crêpe and twill for trousers and linings, cut on the bias where it needs to move." },
];

export default function AtelierPage() {
  return (
    <>
      <section className="grid bg-subtle md:grid-cols-2">
        <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[40rem]">
          <Image
            src={atelierImage.src}
            alt={atelierImage.alt}
            fill
            preload
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="flex items-center px-4 py-16 sm:px-6 md:px-12 lg:px-20">
          <div className="max-w-md">
            <p className="text-label mb-4 text-muted">The house</p>
            <h1 className="text-heading">Made slowly, in rooms we know</h1>
            <p className="mt-6">
              We work with four family workshops in Lombardy and Campania, most of them for more than twenty years. We
              know the people at each bench by name, and they know how we like a shoulder to fall.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-page">
          <div className="mb-10 max-w-xl md:mb-14">
            <p className="text-label mb-3 text-muted">Eleven pairs of hands</p>
            <h2 className="text-heading">The life of a coat</h2>
          </div>
          <ol className="grid gap-10 sm:grid-cols-2 md:gap-x-8 md:gap-y-12 lg:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t border-foreground pt-6">
                <p className="text-caption mb-2">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="text-label mb-3">{s.title}</h3>
                <p className="text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="container-page grid gap-10 md:grid-cols-2 md:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden bg-subtle">
            <Image
              src={tailoringImages[1].src}
              alt={tailoringImages[1].alt}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-label mb-3 text-muted">Materials</p>
            <h2 className="text-heading">Chosen to age well</h2>
            <dl className="mt-8 space-y-6">
              {materials.map((m) => (
                <div key={m.title} className="border-t border-line pt-4">
                  <dt className="text-label mb-2">{m.title}</dt>
                  <dd className="text-muted">{m.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-line section">
        <div className="container-narrow text-center">
          <p className="text-label mb-4 text-muted">Small runs</p>
          <h2 className="text-heading">When it sells out, we say so</h2>
          <p className="mt-4 text-muted">
            We make each piece in a short run and rarely repeat it. Rather than remake a coat in a hurry, we mark it sold
            out and start on the next season. Book an hour with a client advisor in the Milan atelier, or by video call.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link href="/collections/suits" className="btn btn-primary">
              Discover tailoring
            </Link>
            <Link href="/collections" className="btn btn-secondary">
              All collections
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
