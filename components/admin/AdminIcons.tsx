type IconProps = React.SVGProps<SVGSVGElement>;

/** 20/24px stroke icons for the admin UI. No icon library — keeps the bundle flat. */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const OverviewIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

/** Stacked sheets — the "Pages" group. */
export const PagesIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 3.5h8.5L20 7v10.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 8 3.5Z" />
    <path d="M16 3.5V7h3.5" />
    <path d="M4 7v12.5A1.5 1.5 0 0 0 5.5 21H16" />
  </svg>
);

export const ProductsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 8h16l-1 12H5L4 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const CategoriesIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
    <circle cx="7.5" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const PhotosIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="8.5" cy="10" r="1.5" />
    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
  </svg>
);

/** Sessions, the audit log — anything about who got in and what they did. */
export const ShieldIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3.5 5 6.2v5.1c0 4 2.9 7.6 7 9.2 4.1-1.6 7-5.2 7-9.2V6.2L12 3.5Z" />
  </svg>
);

/** A delivery van — orders on their way out. */
export const ShipmentsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 6.5h10.5v9H3z" />
    <path d="M13.5 9.5H17l3 3v3h-6.5z" />
    <circle cx="7" cy="17.5" r="1.6" />
    <circle cx="17" cy="17.5" r="1.6" />
  </svg>
);

export const SettingsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 18h15L18 15.5Z" />
    <path d="M10 21h4" />
  </svg>
);

export const ChevronIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

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

export const ExternalIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M14 4h6v6M20 4l-8 8" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const DotIcon = (p: IconProps) => (
  <svg viewBox="0 0 8 8" aria-hidden {...p}>
    <circle cx="4" cy="4" r="4" fill="currentColor" />
  </svg>
);
