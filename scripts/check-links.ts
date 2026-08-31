/**
 * Checks every internal link in the **published** content and reports the dead
 * ones.
 *
 *     npm run content:check-links
 *
 * This exists because the "Shop Series 026" button on the homepage has now been
 * reported dead twice by a person looking at the site. The first fix changed
 * `data/homepage.ts`, which is only the *seed* — once anything has been
 * published, `.content/site.json` (or the `ContentDocument` row) is what the
 * storefront reads and `/data` is never consulted again. So the repo looked
 * fixed and the running site was not. DECISIONS §31.
 *
 * Deliberately a script rather than a publish-time refusal. An editor can
 * legitimately point a link at a product they are about to add, and failing
 * their publish for it would be worse than telling them afterwards. This is
 * cheap to run in CI or before a deploy, and it reads the same store the
 * storefront does — file or Postgres, whichever is configured — so it is
 * checking what is actually served.
 *
 * Run through `tsx --conditions=react-server`, which is what makes the
 * `import "server-only"` guard inside `lib/contentStore.ts` resolve to a no-op.
 * A plain `tsx` invocation throws there. It is a node resolution flag rather
 * than an env var, so it works on Windows as well as POSIX — `import-content.ts`
 * sidesteps the same problem by reading the JSON itself, which is why that
 * script cannot see a Postgres-backed store and this one can.
 */
import { contentStore } from "../lib/contentStore";

/** Routes that exist as files rather than as content. */
const STATIC_ROUTES = new Set([
  "/",
  "/bag",
  "/wishlist",
  "/products",
  "/collections",
  "/search",
  "/account",
  "/checkout",
]);

/** `app/(policies)/[slug]` — the four are the ids in `data/policies.ts`. */
const POLICY_ROUTES = new Set(["/privacy", "/returns", "/shipping", "/terms"]);

/** Synthetic collections in `lib/catalogue.ts` that are not categories. */
const COLLECTION_VIEWS = new Set(["all", "new", "sale"]);

interface Found {
  href: string;
  /** Where in the document it came from, so a failure is actionable. */
  at: string;
}

/**
 * Walks the content for anything shaped like a link.
 *
 * Keyed on the property name rather than on "any string starting with /",
 * because product image `src` values also start with a slash and are not
 * navigable routes.
 */
function collectHrefs(node: unknown, path: string, out: Found[]): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectHrefs(child, `${path}[${i}]`, out));
    return;
  }
  if (!node || typeof node !== "object") return;

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "href" && typeof value === "string") {
      // External links are somebody else's to keep alive.
      if (value.startsWith("/")) out.push({ href: value, at: `${path}.${key}` });
    } else {
      collectHrefs(value, `${path}.${key}`, out);
    }
  }
}

async function main(): Promise<void> {
  const { homepage, collectionPage, products } = await contentStore.read();

  const categoryIds = new Set(homepage.categories.items.map((c) => c.id));
  const productIds = new Set(products.map((p) => p.id));

  const found: Found[] = [];
  collectHrefs(homepage, "homepage", found);
  collectHrefs(collectionPage, "collectionPage", found);
  collectHrefs(products, "products", found);

  const resolves = (href: string): boolean => {
    // Query and hash are routing noise for this purpose.
    const path = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (STATIC_ROUTES.has(path) || POLICY_ROUTES.has(path)) return true;
    if (path.startsWith("/collections/")) {
      const slug = path.slice("/collections/".length);
      return categoryIds.has(slug) || COLLECTION_VIEWS.has(slug);
    }
    if (path.startsWith("/products/")) return productIds.has(path.slice("/products/".length));
    return false;
  };

  const dead = found.filter((f) => !resolves(f.href));
  const unique = new Set(found.map((f) => f.href));

  console.log(`Checked ${unique.size} distinct internal links in the published content.`);

  if (dead.length === 0) {
    console.log("All resolve.");
    return;
  }

  console.error(`\n${dead.length} dead link${dead.length === 1 ? "" : "s"}:`);
  for (const { href, at } of dead) console.error(`  ${href}\n    at ${at}`);
  console.error(
    "\nThese are in the PUBLISHED content. Editing /data will not fix them — " +
      "change them in /admin and publish, or they stay dead. DECISIONS §31.",
  );
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
