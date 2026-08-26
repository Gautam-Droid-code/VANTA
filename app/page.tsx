import { getProducts, homepage } from "@/data";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Lookbook } from "@/components/Lookbook";
import { BrandStatement } from "@/components/BrandStatement";
import { ProductRail } from "@/components/ProductRail";
import { TrustStrip } from "@/components/TrustStrip";
import { CategoryList } from "@/components/CategoryList";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { ScrollEngine } from "@/components/scroll/ScrollEngine";
import { EnvironmentMorph } from "@/components/scroll/EnvironmentMorph";
import { PinnedHero } from "@/components/scroll/PinnedHero";
import { ParallaxGroup } from "@/components/scroll/Parallax";
import { TiltOnScroll } from "@/components/scroll/TiltOnScroll";
import { ChapterIndex } from "@/components/scroll/ChapterIndex";

/**
 * The homepage is a thin composition layer: it reads content from `/data` and
 * hands each section exactly what it needs. No copy or imagery lives here.
 *
 * The scroll scenes wrap sections rather than replacing them — each section is
 * still a server component, and the cinematic wrappers are client leaves that
 * only animate what's already been rendered (DECISIONS.md §13, §18).
 *
 * Motion score:
 *   1. Hero          pinned — camera pulls back, copy lifts, frame dims
 *   2. Lookbook      multi-depth parallax across the three looks
 *   3. Brand stmt    slow camera move over a single portrait
 *   4. Product rail  gentle lift, no pin — the eye needs to read prices here
 *   5. Trust         a quiet beat, deliberately still
 *   6. Categories    the environment has cooled to graphite by now
 */
/** The spine down the left edge. Ids must match the section wrappers below. */
const CHAPTERS = [
  { id: "chapter-hero", label: "Made to Move" },
  { id: "chapter-lookbook", label: "The Looks" },
  { id: "chapter-series", label: "Series 026" },
  { id: "chapter-shop", label: "The Kit" },
  { id: "chapter-categories", label: "Browse" },
];

export default function HomePage() {
  const railProducts = getProducts(homepage.productRail.productIds);

  return (
    <div className="storefront-shell">
      <ScrollEngine />
      <EnvironmentMorph />
      <ChapterIndex chapters={CHAPTERS} />

      <Navbar nav={homepage.nav} />
      <main id="main">
        <div id="chapter-hero">
          <PinnedHero>
          <Hero hero={homepage.hero} />
          </PinnedHero>
        </div>

        <ParallaxGroup className="scroll-mt-24" >
          <div id="chapter-lookbook">
              <Lookbook slides={homepage.lookbook.slides} />
          </div>
        </ParallaxGroup>

        <TiltOnScroll>
          <div id="chapter-series">
            <BrandStatement content={homepage.brandStatement} />
          </div>
        </TiltOnScroll>

        <ParallaxGroup distance={40}>
          <div id="chapter-shop">
            <ProductRail content={homepage.productRail} products={railProducts} />
          </div>
        </ParallaxGroup>

        <TrustStrip items={homepage.trust.items} />

        <div id="chapter-categories">
          <CategoryList
            heading={homepage.categories.heading}
            items={homepage.categories.items}
          />
        </div>
      </main>
      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
