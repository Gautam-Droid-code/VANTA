/**
 * Content schema for the VANTA homepage.
 *
 * Everything rendered on the homepage is described by these types and lives in
 * `/data`. Components are dumb — they take these objects as props and render
 * them. A future admin dashboard can read and write exactly this shape (as JSON
 * from a DB or CMS) without touching a single component.
 *
 * Rules of thumb when extending:
 *  - No JSX, no class names, no Tailwind tokens in here. Only content + intent.
 *  - "Intent" is expressed as a named enum-ish union (e.g. `backdrop`), which
 *    the component maps to actual styling.
 */

/** Named accent backdrops. Components map these to gradients/solids. */
export type Backdrop = "red" | "orange" | "sunset" | "graphite";

export interface ImageAsset {
  src: string;
  /** Empty string marks the image as decorative. */
  alt: string;
  width: number;
  height: number;
  /** Optional LQIP; used as `blurDataURL` when present. */
  blurDataURL?: string;
}

export interface Link {
  label: string;
  href: string;
  /** Renders with an external-link affordance (e.g. WhatsApp support). */
  external?: boolean;
}

/**
 * A headline split into lines, where each line is a list of segments.
 * `accent: true` renders the segment in the italic serif.
 * This keeps the sans/serif mix editable as data rather than baked into JSX.
 */
export interface HeadlineSegment {
  text: string;
  accent?: boolean;
}

export type HeadlineLine = HeadlineSegment[];

export interface Cta {
  label: string;
  href: string;
}

export interface HeroContent {
  headline: HeadlineLine[];
  description: string;
  cta: Cta;
  image: ImageAsset;
  backdrop: Backdrop;
}

export interface LookSlide {
  id: string;
  image: ImageAsset;
  backdrop: Backdrop;
  caption: string;
  href: string;
}

export interface BrandStatementContent {
  eyebrow: string;
  headline: HeadlineLine[];
  description: string;
  cta: Cta;
  image: ImageAsset;
  backdrop: Backdrop;
}

export interface Product {
  id: string;
  name: string;
  /** Whole rupees. */
  price: number;
  /** Whole rupees; when set and above `price`, shown struck through. */
  compareAtPrice?: number;
  image: ImageAsset;
  backdrop: Backdrop;
  href: string;
  codAvailable: boolean;
  /** Small corner flag, e.g. "NEW" / "LOW STOCK". Omit for none. */
  badge?: string;
}

export interface ProductRailContent {
  headline: HeadlineLine[];
  viewAll: Link;
  productIds: string[];
}

export type TrustIcon = "shipping" | "returns" | "cod" | "secure";

export interface TrustItem {
  id: string;
  icon: TrustIcon;
  title: string;
  detail: string;
}

export interface Category {
  id: string;
  name: string;
  href: string;
  /** Revealed behind the row on hover (desktop) / tap (mobile). */
  image: ImageAsset;
  itemCount: number;
}

export type BottomNavIcon = "home" | "shop" | "wishlist" | "bag";

export interface BottomNavItem {
  id: string;
  icon: BottomNavIcon;
  label: string;
  href: string;
}

export interface NavContent {
  wordmark: string;
  links: Link[];
  bottomNav: BottomNavItem[];
}

export interface FooterContent {
  wordmark: string;
  tagline: string;
  links: Link[];
  copyright: string;
}

export interface HomepageContent {
  nav: NavContent;
  hero: HeroContent;
  lookbook: {
    slides: LookSlide[];
  };
  brandStatement: BrandStatementContent;
  productRail: ProductRailContent;
  trust: {
    items: TrustItem[];
  };
  categories: {
    heading: string;
    items: Category[];
  };
  footer: FooterContent;
}
