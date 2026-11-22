// Editorial imagery, not catalog data: the homepage, /campaign and /atelier
// share these, so they live in one place rather than as copied URLs.

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=1600`;

export const heroImage = {
  src: unsplash("1539109136881-3be0616acf4b"),
  alt: "A woman in a pale blue wool coat standing in a cathedral square",
};

export const tailoringImages = [
  { src: unsplash("1617137968427-85924c800a22"), alt: "A man in a navy two-piece suit walking past a glass facade" },
  { src: unsplash("1507679799987-c73779587ccf"), alt: "Close-up of hands buttoning a charcoal suit jacket" },
] as const;

export const atelierImage = {
  src: unsplash("1445205170230-053b83016050"),
  alt: "Coats and knitwear hanging in a softly lit shop window",
};
