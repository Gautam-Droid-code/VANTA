import { z } from "zod";
import type { BrandStatementContent, HeroContent, HomepageContent, Product } from "@/data/types";
import type { SiteContent } from "./contentStore";

/**
 * Runtime validation for anything arriving from a browser.
 *
 * The publish action is behind a session, but an authenticated request is still
 * an untrusted one: the payload is JSON assembled on the client and can be
 * anything. Unvalidated content would reach the storefront and break it — a
 * bogus `backdrop`, for instance, indexes `backdropClass` to `undefined`.
 *
 * Every schema below is pinned to its TypeScript counterpart with
 * `satisfies z.ZodType<T>`. If `data/types.ts` gains or changes a field and
 * this file isn't updated, the build fails — the validator cannot silently
 * drift away from the schema it is meant to enforce.
 */

/** Trimmed, and required to still have content — a blank headline is a bug. */
const nonEmpty = z.string().trim().min(1);
/** Alt text is intentionally allowed to be empty: that marks it decorative. */
const altText = z.string();

const backdrop = z.enum(["red", "orange", "sunset", "graphite"]);

const imageAsset = z.object({
  src: nonEmpty,
  alt: altText,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  blurDataURL: z.string().optional(),
});

const link = z.object({
  label: nonEmpty,
  href: nonEmpty,
  external: z.boolean().optional(),
});

const cta = z.object({ label: nonEmpty, href: nonEmpty });

const headlineSegment = z.object({ text: z.string(), accent: z.boolean().optional() });
/** A line is a list of segments; a headline is a list of lines. */
const headline = z.array(z.array(headlineSegment).min(1)).min(1);

const heroContent = z.object({
  headline,
  description: z.string(),
  cta,
  image: imageAsset,
  backdrop,
}) satisfies z.ZodType<HeroContent>;

const lookSlide = z.object({
  id: nonEmpty,
  image: imageAsset,
  backdrop,
  caption: z.string(),
  href: nonEmpty,
});

const brandStatement = z.object({
  eyebrow: z.string(),
  headline,
  description: z.string(),
  cta,
  image: imageAsset,
  backdrop,
}) satisfies z.ZodType<BrandStatementContent>;

const product = z.object({
  id: nonEmpty,
  name: nonEmpty,
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().optional(),
  image: imageAsset,
  backdrop,
  href: nonEmpty,
  codAvailable: z.boolean(),
  badge: z.string().optional(),
}) satisfies z.ZodType<Product>;

const productRail = z.object({
  headline,
  viewAll: link,
  productIds: z.array(nonEmpty),
});

const trustItem = z.object({
  id: nonEmpty,
  icon: z.enum(["shipping", "returns", "cod", "secure"]),
  title: nonEmpty,
  detail: z.string(),
});

const category = z.object({
  id: nonEmpty,
  name: nonEmpty,
  href: nonEmpty,
  image: imageAsset,
  itemCount: z.number().int().nonnegative(),
});

const navContent = z.object({
  wordmark: nonEmpty,
  links: z.array(link),
  bottomNav: z.array(
    z.object({
      id: nonEmpty,
      icon: z.enum(["home", "shop", "wishlist", "bag"]),
      label: nonEmpty,
      href: nonEmpty,
    }),
  ),
});

const footerContent = z.object({
  wordmark: nonEmpty,
  tagline: z.string(),
  links: z.array(link),
  copyright: z.string(),
});

const homepageContent = z.object({
  nav: navContent,
  hero: heroContent,
  lookbook: z.object({ slides: z.array(lookSlide) }),
  brandStatement,
  productRail,
  trust: z.object({ items: z.array(trustItem) }),
  categories: z.object({ heading: nonEmpty, items: z.array(category) }),
  footer: footerContent,
}) satisfies z.ZodType<HomepageContent>;

export const siteContentSchema = z
  .object({
    homepage: homepageContent,
    products: z.array(product),
  })
  /**
   * Cross-field rule the per-field schemas cannot express: the rail references
   * products by id, so every id it lists must actually exist. Without this a
   * publish could leave the rail pointing at a deleted product.
   */
  .superRefine((value, ctx) => {
    const ids = new Set(value.products.map((p) => p.id));
    value.homepage.productRail.productIds.forEach((id, i) => {
      if (!ids.has(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["homepage", "productRail", "productIds", i],
          message: `Product rail references unknown product "${id}".`,
        });
      }
    });

    const seen = new Set<string>();
    value.products.forEach((p, i) => {
      if (seen.has(p.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["products", i, "id"],
          message: `Duplicate product id "${p.id}".`,
        });
      }
      seen.add(p.id);
    });
  }) satisfies z.ZodType<SiteContent>;
