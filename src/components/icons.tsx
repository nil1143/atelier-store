import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  "aria-hidden": true,
};

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const AccountIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);

export const BagIcon = () => (
  <svg {...base}>
    <path d="M5 8h14l-1 12.5H6L5 8Z" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
  </svg>
);

export const MenuIcon = () => (
  <svg {...base}>
    <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
  </svg>
);

export const CloseIcon = () => (
  <svg {...base}>
    <path d="m5 5 14 14M19 5 5 19" />
  </svg>
);
