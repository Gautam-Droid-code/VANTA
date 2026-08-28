import type { BottomNavIcon, TrustIcon } from "@/data/types";

type IconProps = React.SVGProps<SVGSVGElement>;

/**
 * Hand-rolled 24px stroke icons — no icon library, so nothing extra lands in
 * the bundle. All share the same 1.5 stroke weight for a technical feel.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MenuIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const BagIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16l-1.2 13H5.2L4 7Z" />
    <path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
  </svg>
);

/** Head and shoulders — the account entry point in the header. */
export const UserIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" />
  </svg>
);

export const ShopIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8h16l-1 12H5L4 8Z" />
    <path d="M4 8l1.5-4h13L20 8" />
  </svg>
);

/** Four cells — the conventional "browse everything" affordance. */
export const GridIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const TruckIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M2 7h11v9H2V7Z" />
    <path d="M13 10h4.5L21 13.5V16h-8v-6Z" />
    <circle cx="6.5" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const ReturnIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 9a8 8 0 1 1 1.4 6" />
    <path d="M3 4v5h5" />
  </svg>
);

export const RupeeIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.5 8h5M9.5 10.6h5M13 8c1.6 0 2.2 1.2 2.2 2.3 0 1.4-1 2.4-2.7 2.4H10l4 4" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 19 6v6c0 4-3 7-7 8.5C8 19 5 16 5 12V6l7-2.5Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </svg>
);

export const trustIcons: Record<TrustIcon, (p: IconProps) => React.JSX.Element> = {
  shipping: TruckIcon,
  returns: ReturnIcon,
  cod: RupeeIcon,
  secure: ShieldIcon,
};

export const bottomNavIcons: Record<BottomNavIcon, (p: IconProps) => React.JSX.Element> = {
  home: HomeIcon,
  shop: ShopIcon,
  wishlist: HeartIcon,
  bag: BagIcon,
};
