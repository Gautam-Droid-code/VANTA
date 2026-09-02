import { contentStore } from "@/lib/contentStore";
import { leafCategories, withProductCounts } from "@/lib/catalogue";
import { policies } from "@/data/policies";
import { siteUrl, siteUrlIsPlaceholder } from "@/lib/siteUrl";

/**
 * `/llms.txt` — a plain-Markdown summary of the site for language models.
 *
 * The convention is **plural**: `llms.txt`, at the root, Markdown, as proposed
 * at llmstxt.org. `/llm.txt` is a common mistranscription and is aliased by a
 * redirect in `next.config.mjs` rather than served twice, so there is one
 * document and one URL that owns it.
 *
 * Generated rather than a static file in `public/`, for the same reason the
 * category counts are derived (§30): a hand-written summary of a catalogue is
 * a copy of the catalogue, and it drifts. Every product count, category name
 * and policy title below comes from the live content store, so this cannot
 * describe a shop that no longer exists.
 *
 * **Contains no invented business facts.** Deliberately no address, no GSTIN,
 * no phone number, no founding date — those are the details `data/policies.ts`
 * admits are placeholder, and a machine-readable file is exactly the wrong
 * place to launder them into something that looks authoritative. The shipping
 * and returns terms below are the ones the storefront already states on its own
 * trust strip.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const [{ homepage, products, collectionPage }] = await Promise.all([contentStore.read()]);

  const categories = withProductCounts(leafCategories(homepage.categories.items), products);
  const prices = products.map((p) => p.price).sort((a, b) => a - b);
  const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  /**
   * Absolute where we can, relative where we cannot. A model given
   * `http://localhost:3000/products` would record a URL that resolves for
   * nobody; a relative path is unambiguous about being relative.
   */
  const link = (path: string) => (siteUrlIsPlaceholder ? path : `${siteUrl}${path}`);

  const body = `# VANTA

> ${homepage.hero.description?.trim() || "Technical streetwear built for the Indian street."}

VANTA is an Indian direct-to-consumer streetwear label. The catalogue is
technical outerwear and utility clothing — shell jackets, parkas, cargo
trousers, tops and bags — sold online and shipped across India.

This file is generated from the live catalogue, so the counts and category
names below are current as of the moment you fetched it.

## Catalogue

${products.length} products across ${categories.length} categories, priced from ${rupees(prices[0] ?? 0)} to ${rupees(prices[prices.length - 1] ?? 0)}.

${categories.map((c) => `- [${c.name}](${link(`/collections/${c.id}`)}) — ${c.count} ${c.count === 1 ? "piece" : "pieces"}`).join("\n")}

## Key pages

- [Home](${link("/")}) — the current drop and featured pieces
- [All products](${link("/products")}) — every piece, sortable
- [Collections](${link("/collections")}) — ${collectionPage.indexHeading}, browsable by category
- [New drops](${link("/collections/new")}) — recently added
- [Sale](${link("/collections/sale")}) — reduced pieces
- [Search](${link("/search")}) — by piece, category or colour

## Shipping and returns

- Ships across India. Free shipping on orders over ₹1,999.
- Cash on delivery is available pan-India. Availability is shown per product,
  and a pincode check on each product page confirms serviceability and gives an
  estimated delivery date before you add anything to a bag.
- Returns accepted within seven days of delivery.
- Online payment (card, UPI, netbanking, wallet) and cash on delivery are both
  supported at checkout.

${policies.map((p) => `- [${p.title}](${link(`/${p.slug}`)}) — ${p.intro}`).join("\n")}

> Note: the policy pages are currently placeholder copy pending legal review,
> and say so on the page. Treat the terms above as the storefront's stated
> intent rather than as reviewed legal text.

## Not for crawling

Account, bag, wishlist, checkout, order and admin pages are private, carry
\`noindex\`, and are disallowed in [robots.txt](${link("/robots.txt")}). Order pages
in particular contain a customer's name, address and phone number.
`;

  return new Response(body, {
    headers: {
      // Markdown, explicitly UTF-8: the file is full of ₹ and em dashes.
      "content-type": "text/markdown; charset=utf-8",
      // Cheap to regenerate, and it changes when the catalogue does.
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
