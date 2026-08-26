import type { ComponentType, SVGProps } from "react";
import {
  CategoriesIcon,
  OverviewIcon,
  PhotosIcon,
  ProductsIcon,
  SectionsIcon,
  SettingsIcon,
} from "./AdminIcons";

export interface AdminNavChild {
  label: string;
  href: string;
  /** Editors not yet built are shown but disabled, so scope stays visible. */
  ready?: boolean;
}

export interface AdminNavItem {
  label: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  children?: AdminNavChild[];
  ready?: boolean;
}

/**
 * Sidebar structure. The "Homepage Sections" children mirror the keys of
 * `HomepageContent` in `data/types.ts` exactly — one editor per section, so the
 * nav can never drift from what the schema actually contains.
 */
export const adminNav: AdminNavItem[] = [
  { label: "Overview", href: "/admin", icon: OverviewIcon, ready: true },
  {
    label: "Homepage Sections",
    href: "/admin/sections",
    icon: SectionsIcon,
    children: [
      { label: "Hero", href: "/admin/sections/hero", ready: true },
      { label: "Lookbook", href: "/admin/sections/lookbook", ready: true },
      { label: "Brand Statement", href: "/admin/sections/brand-statement", ready: true },
      { label: "Product Rail", href: "/admin/sections/product-rail", ready: true },
      { label: "Trust Strip", href: "/admin/sections/trust", ready: true },
      { label: "Navigation", href: "/admin/sections/navigation", ready: true },
      { label: "Footer", href: "/admin/sections/footer", ready: true },
    ],
  },
  { label: "Products", href: "/admin/products", icon: ProductsIcon, ready: true },
  { label: "Categories", href: "/admin/categories", icon: CategoriesIcon, ready: true },
  { label: "Photos & Images", href: "/admin/photos", icon: PhotosIcon },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
];
