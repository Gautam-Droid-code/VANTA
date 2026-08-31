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
  /**
   * Which `Category` this belongs to, by `Category.id`.
   *
   * The first field added to this schema since it was written. Collection
   * pages need to know what belongs in them, and the alternative — listing
   * product ids on each category, the way `ProductRail` does — puts the
   * relationship somewhere a product editor cannot see it. A product knowing
   * its own category is also the answer that stays right when there are
   * hundreds of them.
   */
  categoryId: string;
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
  /**
   * When the current badge was applied, as an ISO date string.
   *
   * Exists so the admin can point out a badge that has gone stale — a product
   * marked NEW in January is still in New Drops in June, because nothing
   * expires it. Without a date there is no way to ask "how long has this been
   * new", and the reminder could not exist at all.
   *
   * Stamped by the publish action rather than typed by an editor: a date
   * someone has to remember to set is a date that is wrong. Optional because
   * products badged before this field existed have no answer, and inventing
   * one would mean flagging them all on the day it shipped.
   */
  badgeSetAt?: string;
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
  /*
   * No `itemCount`. It used to be stored and typed by hand, and it drifted from
   * the catalogue on every single category. Counts are derived —
   * `withProductCounts` in `lib/catalogue.ts`. See DECISIONS §30.
   */
  /**
   * The group this category sits inside, by `Category.id`.
   *
   * "Clothing" and "Accessories" are not things a product is instead of being
   * a jacket — they are what a jacket is part of. Modelling them as sibling
   * categories would force a product to choose one, so they are parents, and
   * a parent's collection page shows everything in its children.
   *
   * One level only: a category with a `parentId` may not itself be a parent.
   * Deeper nesting is a menu design nobody navigates well, and every layout
   * here would have to grow a recursive case to support it.
   */
  parentId?: string;
  /**
   * Page-level content for this category's own collection page.
   *
   * Both optional: a collection page is complete without them, and the page
   * falls back to its plain heading. Making them required would force copy to
   * be invented for every category before any of them could be published.
   */
  description?: string;
  /** Wide image above the product grid. Omit for the plain heading. */
  banner?: ImageAsset;
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

/**
 * Content shared by every collection page, and by the collections index.
 *
 * Separate from `Category` because it is a different kind of thing: a category
 * describes one collection, this describes the template all of them render in.
 * Folding it into `Category` would mean storing the same empty-state message
 * once per category and keeping them in sync by hand.
 */
export interface CollectionPageContent {
  /** The `/collections` index. */
  indexHeading: string;
  indexIntro: string;
  /** Shown when a collection has no products in it. */
  emptyMessage: string;
  emptyCtaLabel: string;
  /** Whether "12 pieces" appears next to the heading. */
  showCount: boolean;
  /**
   * Titles for the three computed views. They are not categories, so they have
   * no `Category` to carry a name — before this they were hardcoded.
   */
  viewNames: {
    all: string;
    new: string;
    sale: string;
  };
}

/**
 * A policy page — returns, shipping, terms, privacy.
 *
 * Structured as sections rather than one blob of prose so the page can render
 * real headings, and so an editor can later change a paragraph without being
 * handed a wall of text. Same reasoning as headlines being segments.
 */
export interface PolicySection {
  heading: string;
  /** Paragraphs. Blank lines within one are preserved at render time. */
  body: string[];
}

export interface PolicyPage {
  slug: string;
  title: string;
  /** Shown under the heading, e.g. "Last updated 28 August 2026". */
  updated: string;
  intro: string;
  sections: PolicySection[];
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
