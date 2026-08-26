# VANTA — Architecture Decisions & Known Issues

Running record of choices that aren't obvious from the code, plus open items.
Newest sections appended at the bottom.

---

## 1. Content layer: `/data` is the single source of truth

**Decision.** Every piece of homepage content — headlines, copy, images, product
data, category data, nav links, footer links — lives in `/data` as typed objects.
Components receive it as props and render it. No component contains copy or image
paths.

**Why.** A future admin dashboard needs to read and write this content without a
rebuild and without touching the component layer. Keeping components purely
presentational means the dashboard only has to satisfy the types in
[`data/types.ts`](data/types.ts) — it can serve the same shape from a database or
CMS and nothing downstream changes.

**Consequences / rules when extending:**

- `data/types.ts` describes *content and intent only*. No JSX, no class names, no
  Tailwind tokens.
- Styling intent is expressed as a named union that a component maps to actual
  styling. `Backdrop` (`"red" | "orange" | "sunset" | "graphite"`) is the model:
  the data layer names a mood, [`lib/backdrops.ts`](lib/backdrops.ts) maps it to
  gradient classes. An editor picks "orange"; they never see a hex value.
- Headlines are structured data, not strings. A `HeadlineLine[]` is a list of
  lines, each a list of segments, where `accent: true` renders that segment in
  the italic serif. This is what makes the sans/serif mix editable — which words
  are italic is content, not markup. `components/ui/Headline.tsx` is the only
  place that knows how to render it.

## 2. One motion vocabulary in `lib/motion.ts`

**Decision.** All easings, durations, and variants are defined once in
[`lib/motion.ts`](lib/motion.ts) and imported. Components do not define inline
transitions with ad-hoc numbers.

**Why.** Consistency is what separates "premium" motion from "janky". Two
easing curves only: `ease.out` for entrances, `ease.inOut` for hovers and state
changes. Durations are `fast` / `base` / `slow` (150/250/400ms).

**Reduced motion** is handled at two layers, deliberately:

1. `<MotionConfig reducedMotion="user">` in `components/Providers.tsx` covers
   every Framer Motion animation in the tree, so no component needs its own
   check.
2. A `@media (prefers-reduced-motion: reduce)` block in `app/globals.css`
   collapses CSS transitions and `scroll-behavior`, which Framer doesn't own.

Note that Framer's `reducedMotion="user"` disables **transform** animations but
intentionally keeps **opacity** ones. That is the documented behaviour, not a
bug — see §7 for how this bit us during testing.

**Where motion is allowed to live is a separate rule — see §13.** Importing
from `lib/motion.ts` does not make a component client-side; only rendering a
`motion.*` element does.

## 3. Carousels: native CSS scroll-snap, JS is read-only

**Decision.** The mobile lookbook carousel and product rail scroll with native
CSS `scroll-snap` (`.snap-rail` / `.snap-item` in `globals.css`). JavaScript
never drives the scroll position during a swipe.

**Why.** Native scrolling gives real momentum and stays on the compositor —
genuine 60fps on mid-range Android, which matters for the target market. A
JS-animated carousel cannot match it.

`lib/useActiveSnap.ts` only *observes* scroll position (rAF-throttled, passive
listener) to light up the correct dot indicator. Its `scrollTo` is used solely
when a user taps a dot, and it honours `prefers-reduced-motion` by falling back
to `behavior: "auto"`.

**One DOM tree serves both breakpoints.** The rail becomes a grid at `lg` via
`lg:grid lg:overflow-visible` rather than rendering separate mobile and desktop
markup. Less duplication, and no risk of the two drifting apart.

## 4. Desktop product grid uses `auto-fit`

**Decision.** The desktop product grid is
`lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]`, not a fixed column count.

**Why.** The rail's contents are data-driven, so the count can change from the
admin layer. A hard-coded `grid-cols-4` orphans the 5th card on its own row.
`auto-fit` keeps any count balanced on one row until it genuinely runs out of
width.

**Trade-off.** The column count is therefore a function of viewport width, not a
fixed design decision — at 1440px with 5 products it resolves to 5 columns. If a
future design requires exactly N columns regardless of count, this needs
revisiting.

## 5. Hover-scale is gated behind `motion-safe`

Product and lookbook images scale 1.0 → 1.05 on hover via
`motion-safe:group-hover:scale-105`. The `motion-safe` prefix matters beyond
accessibility: on touch devices `:hover` can stick after a tap, leaving a card
permanently zoomed. Verified to scale to exactly `matrix(1.05, …)` on pointer
enter and revert on leave.

## 6. Next.js 16 upgrade (from 14)

`npx @next/codemod@latest upgrade latest` upgraded dependencies but **halted at
an interactive prompt** ("Is your app deployed to Vercel?") before running any
source-level codemod. Each was verified manually instead; the project uses no
async request APIs (`params`, `searchParams`, `cookies()`, `headers()`) and no
middleware, so all were no-ops except the lint migration.

Four manual fixes were required:

| Issue | Fix |
|---|---|
| The codemod installed `eslint@10`, but `eslint-config-next@16.3.1` bundles `eslint-plugin-react@7.37.5`, which peers at `eslint ^9.7` and crashes on ESLint 10's rule-context API | **Pinned ESLint to 9.** `eslint-config-next` declares a too-loose `eslint: >=9.0.0`. Revisit when it ships an ESLint 10-compatible `eslint-plugin-react`. |
| React 19 removed the global `JSX` namespace | `JSX.Element` → `React.JSX.Element` in `components/ui/Icons.tsx` |
| `motion(Component)` deprecated in Framer Motion 11 | `motion.create(Link)` in `components/ui/PillButton.tsx` |
| Mobile menu sheet was `z-40` under a `z-50` header, making its close button unclickable | Sheet raised to `z-[60]`. Pre-existing bug, not an upgrade regression. |

`next lint` was replaced by the ESLint CLI with a flat config
(`eslint.config.mjs`); the legacy `.eslintrc.json` was deleted. Turbopack is the
default bundler in 16 and both `next dev` and `next build` run clean on it.
`npm audit` reports **0 vulnerabilities** (down from 5 high on Next 14).

## 7. How this project gets visually verified

The in-app Browser pane is not displaying in this environment, so the page never
composites frames — `requestAnimationFrame` never fires and scroll events never
dispatch. Any animation or scroll assertion made through it silently reports a
false negative, and screenshots time out.

Verification is therefore done by driving the locally installed Chrome over CDP
with `puppeteer-core`, **installed in a scratchpad directory outside this repo**
so it never becomes a project dependency.

Two traps worth remembering:

- **Headless Chrome defaults `prefers-reduced-motion` to `reduce`.** Combined
  with §2, this makes transform animations silently absent while opacity still
  animates — which looks exactly like a broken reveal. Always call
  `page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }])`
  when testing normal motion.
- **Synthetic `MouseEvent`s do not activate CSS `:hover`.** Use `page.hover()`,
  which dispatches a real CDP pointer move.

## 8. Category rows: one mechanism for hover *and* tap

**Decision.** The thumbnail crossfade behind a category row is driven by Framer
variant propagation on the row link — `whileHover` / `whileFocus` / `whileTap`
all resolve to the same `active` variant, and the backdrop, label offset, and
arrow offset are children that read it.

**Why.** The brief asked for reveal on hover (desktop) *and* tap (mobile).
Tracking pointer type manually means two code paths that drift. One variant
name covers mouse, keyboard focus, and touch, and it crossfades over
`duration.slow` with `ease.inOut` rather than hard-swapping. Verified 0 → 0.38 →
0 on pointer enter/leave.

Labels are `whitespace-nowrap` so they never wrap — the Stitch reference broke
"JACKETS" across two lines, which we explicitly avoid.

## 9. Bottom nav hides at `md`, mobile menu at `lg`

**Decision.** The sticky bottom nav is `md:hidden` (gone from 768px up), while
the navbar switches from hamburger to full links at `lg` (1024px). Tablets
between 768–1023px therefore get the hamburger menu but no bottom bar.

**Why.** A bottom tab bar is a phone idiom; on a tablet it reads as a mistake.
The nav-link switch is driven by available horizontal space, which is a
different question. `body`'s reserved bottom padding in `globals.css` uses the
same `md` breakpoint, so the footer never gains a dead gap.

The active indicator uses a Framer `layoutId`, so it slides between items rather
than popping — free once routes exist, and inert today since only `/` matches.

## 10. Contrast is measured, not eyeballed

The palette leans on opacity over near-black, which makes it easy to drift below
legibility thresholds by accident. Measured effective contrast (composited
opacity over `#0D0D0D`):

| Element | Effective | Ratio |
|---|---|---|
| Product name / price, trust title, active dot | `245,245,240` | 17.8:1 |
| Hero description | `175,175,172` | 8.9:1 |
| Carousel caption, View All | `152,152,149` | 6.7:1 |
| Eyebrow, COD tag, trust detail | `129,129,127` | ~5.0:1 |
| Inactive carousel dot | `117,117,115` | **4.3:1** |

The inactive dot originally sat at `opacity: 0.3` → **2.51:1**, below the 3:1
WCAG 1.4.11 minimum for non-text indicators. Raised to `0.45`. **Any new muted
token below ~40% opacity on `#0D0D0D` should be measured before shipping.**

## 11. Accessible names: `sr-only` text, not `aria-label`, when there's a visible label

**Decision.** Where an element has visible text (the bottom nav's "Bag"), the
count is appended with a `.sr-only` span. Where it has none (the navbar's
icon-only bag), `aria-label` is used and the numeric badge is `aria-hidden`.

**Why.** WCAG 2.5.3 *Label in Name* requires the accessible name to contain the
visible text. `aria-label="Bag, 2 items"` **replaces** the name, and the
element's visible text is "2Bag" (label + badge), which isn't contained in it —
so the element fails. Lighthouse's `label-content-name-mismatch` caught this and
scores it **weight 0**, so the Accessibility category still read 100 while the
audit was failing. Don't trust the category score alone for this.

Note that marking the badge `aria-hidden` is *not* sufficient on its own — axe
still counts an `aria-hidden` element's rendered text as visible text. The
`sr-only` span is what actually fixes it.

Two implementation traps, both hit in practice:

- Put the appended text in **one template string**, not split JSX expressions.
  Chrome's name computation drops whitespace between sibling text nodes, giving
  "2ITEMS".
- Add `normal-case`, or the parent's `uppercase` leaks into the announced name.

The result is `"BAG , 2 items"` — the stray space before the comma is an
artifact of Chrome concatenating separate text nodes and isn't worth chasing;
the audit passes and the announcement is clear.

## 12. Images are WebP at rest; originals live outside `/public`

**Decision.** `/public/images` holds only WebP (sharp, quality 82, native
dimensions). The source PNGs are kept in **`/assets-src/images`**, which is
outside `/public` so it is never served.

**Why.** Next's optimiser was already transcoding to WebP on the fly, so this
changed delivered bytes only modestly (182 KB → 158 KB). The real wins are at
rest — **6.39 MB → 0.23 MB** of served assets — plus no per-image transcode on
first request. Native dimensions were kept because they already match the
largest rendered size (the hero is ~848px at 2x on a 412px viewport); Next
still resizes down per breakpoint from there.

When adding imagery: convert to WebP first, drop the original in
`/assets-src/images`, and reference the `.webp` from `/data`.

## 13. Animate the leaf, not the section

**Rule.** A section shell is a server component. Only the elements that actually
animate are client components, and they are the smallest possible wrappers
around server-rendered children.

Every section originally carried `"use client"` because it rendered a
`motion.*` element somewhere inside. That made the whole homepage a client tree.
The fix is to pass server-rendered markup as `children` into small client
wrappers, which React allows: a client component may render server-rendered
children when a server parent creates them.

**Current split:**

| Server (shell) | Client (leaf) | Why it must be client |
|---|---|---|
| `Hero` | `hero/HeroHeadline`, `hero/HeroCopy` | Load-time reveal. **The hero `<img>` stays in the server shell — it's the LCP element, so nothing should have to hydrate before it paints.** |
| `Lookbook` | `LookbookRail` | Needs the rail ref + dot state (`useActiveSnap`) |
| `BrandStatement`, `ProductRail`, `TrustStrip`, `Footer` | `ui/Reveal` wrappers only | Scroll-triggered reveal |
| `ProductCard` | — | Fully static; hover zoom is a CSS transition |
| `CategoryList` | `CategoryRow` | The row *is* the interaction (§8) |
| — | `Navbar`, `BottomNav`, `PillButton`, `Providers`, `BagProvider` | Inherently stateful/interactive |

**The primitives** in `components/ui/Reveal.tsx`:

- `Reveal` — standalone fade-up; declares its own scroll trigger.
- `RevealGroup` — owns the trigger and staggers descendants.
- `RevealItem` — **deliberately declares no `initial`/`whileInView`.** It
  inherits the group's state, which is what makes the stagger work. Give it its
  own trigger and every child animates at once.

Variants objects (`fadeUp`, `stagger(0.06)`) are plain serializable data, so a
server component can pass them across the boundary as props. Function props
cannot cross — that's why `Headline`'s `renderLine` callback is only used inside
the already-client `HeroHeadline`.

**What this did and didn't buy.** Behaviour is byte-identical and every QA check
matches. But **client JS barely moved: 183.0 KB → 181.1 KB.** Making a section a
server component removes its own code from the bundle, not a shared library its
leaves still import — and Framer Motion is the bulk of that bundle. LCP and
Performance stayed inside the noise band. Do this refactor for the architecture
and the hydration profile; don't expect it to move bytes on its own.

## 14. Admin dashboard: separate visual system, shared schema

`/admin` is a content manager for a non-technical shop employee. It lives in the
same Next.js app but is deliberately **a different visual system** from the
storefront: dark ink sidebar, light workspace, one orange accent, Archivo for
headings only, Inter everywhere else.

**Tokens.** Admin colours live under an `admin.*` key in `tailwind.config.ts`
(`admin-bg`, `admin-surface`, `admin-border`, `admin-ink`, `admin-muted`,
`admin-accent`, …). Storefront tokens (`ink`, `bone`, `flare`) are untouched.
**Don't mix the two families** — an `admin-*` colour in storefront code (or the
reverse) means the boundary has leaked.

**Fonts.** Admin headings need Archivo 600/700, but the storefront deliberately
ships only weight 900 (§10 / README). Those cuts are declared in
`app/admin/fonts.ts` and the variable is applied on the admin layout's wrapper,
so the extra font files load on `/admin` routes only and never enter the
storefront's critical path.

**One storefront change was required.** The mobile bottom-nav spacer used to sit
on `body`, which meant `/admin` inherited a dead 64px gap. It moved to a
`.storefront-shell` class applied in `app/page.tsx`. Verified no regression:
the footer still clears the bottom nav.

**The schema is the contract.** Admin forms bind to the exact fields in
`data/types.ts` — no invented fields, no omitted ones. Where the product brief
disagreed with the schema, the schema won; the conflicts are listed in §15.

## 15. Admin data layer persists through a swappable store

Superseded the in-memory phase. `lib/contentStore.ts` defines the seam:

```ts
interface ContentStore { read(): Promise<SiteContent>; write(next: SiteContent): Promise<void>; }
```

Both surfaces depend on that interface and nothing else. `app/page.tsx` awaits
`contentStore.read()`; the admin dashboard layout reads it once and hands the
result to `AdminDraftProvider` as its baseline. **Neither imports `/data` any
more** — those modules are the store's *seed*, returned on `ENOENT` so a fresh
checkout renders the original content, and ignored from the first publish
onward. Importing them downstream would resurrect the seed over live content.

The shipped adapter writes one JSON document. It needs a writable disk, so it
does not work on a read-only serverless filesystem (Vercel). That is a
deliberate trade for zero external dependencies at this stage; moving to
Postgres/Redis/a CMS means one more class behind the same interface.

Writes go to a temp file and are then `rename`d. Rename is atomic within a
filesystem, so a crash mid-write cannot leave a truncated document — a reader
sees the old file or the new one, never half of either.

### Two things the wiring got wrong first, and why they matter

**`/admin` prerendered as static.** `contentStore.read()` is an `fs` call, which
Next cannot detect as dynamic, so the first build baked the admin's content in
at build time. An editing tool showing stale data is worse than a slow one: the
next publish would write that stale draft back over newer content. The dashboard
layout now sets `export const dynamic = "force-dynamic"`. The storefront is the
opposite case and stays static deliberately — it is regenerated by
`revalidatePath("/")` when something is actually published.

**`discard()` reset to `/data`.** Harmless while nothing persisted; once publish
works, it silently reverts live content back to the seed. It now restores the
last published baseline, held in a ref.

### Validation is not optional here

`app/admin/actions.ts` re-verifies the session rather than relying on
`middleware.ts`: middleware covers page navigations, and a Server Action is a
POST endpoint, not a navigation.

It then validates against `lib/contentSchema.ts`. **Being signed in makes a
request authenticated, not trustworthy** — the payload is JSON assembled in the
browser. An invalid `backdrop` reaches `backdropClass[...]` as `undefined` and
breaks the storefront, so validation is what stands between a typo'd client and
a broken homepage. Each schema is pinned with `satisfies z.ZodType<T>` against
the type it mirrors, so a change to `data/types.ts` that isn't reflected here
fails the build instead of silently passing bad data through.

Two rules are cross-field and live in `superRefine`: every id in
`productRail.productIds` must resolve to a real product, and product ids must be
unique.

`useDraft()`'s consumer contract is unchanged apart from two additions
(`isPublishing`, `publishError`) — no editor component was touched.

### Schema conflicts found while building the admin

| Brief said | Schema says | Resolution |
|---|---|---|
| "Hero and Brand Statement share the same field shape" | `BrandStatementContent` has an extra required `eyebrow: string`; `HeroContent` does not | One shared editor with an **optional** eyebrow field, shown only when the section defines one |
| Products table shows a "status badge" | `Product` has **no** status/published field — only `badge?: string` and `codAvailable: boolean` | Render the real `badge` value plus a COD indicator. **No `status` field invented.** |
| Product editor: name, price, compare-at, image, backdrop, badge, COD | `Product` also requires `id` and `href` | Both included — `href` editable, `id` derived from the name as a slug and shown read-only |
| Badge is a dropdown | `badge?: string` is free-form, not a union | Dropdown of the values in use (`NEW`, `LOW STOCK`, none) **plus a custom text option**, so the control doesn't narrow the type |
| "Image upload" | `ImageAsset` requires `src`, `alt`, `width`, `height` | Picker also captures `alt` (required for a11y); `width`/`height` come from the chosen asset |
| Lookbook slide is "image, backdrop, caption" | `LookSlide` also has `id` and `href` | Both included — `href` editable and marked "Coming soon", `id` auto-derived |
| Product Rail "isn't new content, it's configuration" | `ProductRailContent` is `{ headline, viewAll, productIds }` — it **owns the section headline and the View All link** | Page edits all three. Products are still referenced by id only, never duplicated |
| Trust Strip has "4 fixed items" | `trust.items` is an **unbounded array**; `TrustItem` also has `id` | Add/remove supported. The *icon* picker is fixed, because `TrustIcon` genuinely is a closed union of four |
| WhatsApp support number belongs on Navigation | The WhatsApp link is in **`footer.links`**, not `NavContent` | Number field lives on the Footer page. Navigation links there instead of duplicating it |
| Navigation is "nav links (label + href)" | `NavContent` is `{ wordmark, links, bottomNav }` | Wordmark and the mobile bottom bar (with its own `BottomNavIcon` union) are edited too |
| Footer is "tagline, links list" | `FooterContent` also has `wordmark` and `copyright` | All four edited |
| Categories: "name, item count, thumbnail" | `Category` also has `id` and `href`; the section also has a `heading` | All included — `heading` edited above the table, `id` auto, `href` marked "Coming soon" |

## 15b. Image uploads

`ImagePicker` uploads real files. The pipeline is `processUpload` →
`mediaStore`, served back by `app/media/[id]/route.ts`.

**Uploads are stored outside `/public`.** `/public` is a curated, build-time
asset directory — WebP only, originals in `/assets-src`. Runtime-mutable
uploads mixed into it would blur that line, so they go under `.content/`
alongside the content store, and reach the browser through a route instead.

**Uploads are not draft state.** The file is written and live the moment it
succeeds, whether or not the surrounding section is published. The alternative —
holding bytes in the browser until publish — would mean a draft referencing an
image the server has never seen, and losing the upload on a refresh.

### An upload is hostile until decoded

The filename, the extension and the Content-Type header are all set by the
client, so none of them is evidence of anything. The only thing that establishes
a file is an image is a decoder accepting it. Every check runs against sharp's
reading of the bytes:

- **Re-encoded, always.** Decoding to pixels and writing a fresh WebP means
  nothing of the original container survives — no EXIF (phone photos carry GPS
  coordinates), no colour-profile payloads, no data appended after the image to
  make a polyglot file. What gets served is a file this process wrote.
  `rotate()` applies EXIF orientation *before* that metadata is dropped, or
  portrait phone photos come out sideways.
- **SVG is refused.** It is not a raster image but a document that can carry
  `<script>`; serving one from our own origin would be a stored-XSS primitive.
  GIF is refused too, for the duller reason that re-encoding to still WebP
  silently destroys the animation.
- **`limitInputPixels` is set.** A small, highly compressed file can decode to
  gigabytes. The file-size check cannot catch that — the danger is in the
  decoded size, not the encoded size.
- **Stored names are generated ids, never the client's filename.** The filename
  is sanitised only to be shown as a label. Nothing user-supplied reaches the
  filesystem.
- **The serving route builds no path from the request.** The id must match the
  generated-id pattern and then be present in the manifest; a path is only
  constructed from an id already known to be ours.

Verified against the real cases: EXIF-bearing JPEG comes out with no EXIF and no
trace of the probe string in the bytes; an SVG carrying `<script>` is rejected;
a text file named `.png` is rejected; `../../../etc/passwd.png` yields the label
"passwd"; and `/media/` returns 404 for unknown and malformed ids.

### What this is not

It is not a media library. There is no `/admin/photos` page — upload and delete
live inside the picker, and the sidebar entry stays marked "Soon". Delete does
not check whether an image is still referenced by published content: that would
need a full content scan on every delete, and a reference can be added a moment
later anyway. The picker warns; a missing image degrades to a broken tile, not a
broken page.

## 16. Admin component map

| Component | Role |
|---|---|
| `AdminShell` / `AdminSidebar` | Chrome. Sidebar nav mirrors the keys of `HomepageContent`, so it can't drift from the schema. Unbuilt editors show a "Soon" chip rather than being hidden. |
| `AdminDraftProvider` | In-memory draft state (§15) |
| **`SectionEditor`** | **One editor for both Hero and Brand Statement** |
| `HeadlineEditor` | Edits `HeadlineLine[]` structurally |
| `BackdropPicker` | The four `Backdrop` values, rendered with the real gradients |
| `ImagePicker` | Picks from `mediaLibrary`, edits `alt` |
| `SectionPreview` | Live preview, desktop/mobile |
| `ProductDrawer` | Slide-in product form |

**The shared section editor.** `SectionEditor` takes `HeroContent |
BrandStatementContent` and narrows with an `"eyebrow" in value` type guard. The
eyebrow field renders only for the brand statement; everything else is shared.
Adding a third editorial section means passing it in, not forking the component.

**`HeadlineEditor` exposes the schema's real nesting** — lines containing
segments — rather than flattening it to a string with markup. Add/remove lines,
add/remove segments, toggle accent per segment. Segment inputs render in the
italic serif when accented, so the control previews itself. **Spacing lives in
the segment text** (`"MADE "` has a trailing space), so inputs never trim, and
the helper text says so.

**Two deliberate approximations, both labelled in the UI:**

- `SectionPreview` is *not* the real `Hero`/`BrandStatement`. Those are server
  components and can't be imported into a client tree, so the preview rebuilds
  their layout from the same tokens and `backdropClass` gradients. Good for
  judging copy, image and backdrop; not for pixel sign-off.
- `mediaLibrary` is a hardcoded list of what's in `/public/images`. Real upload
  needs a storage target plus the WebP conversion step in the README, which is
  out of scope for this phase.

**`ProductDrawer` is mounted with a `key`** (the product id, or `"new-product"`)
so opening a different row remounts it and `useState` initialisers pick up the
new product. This replaced a prop→state sync effect that `react-hooks/set-state-in-effect`
correctly flagged.

**The badge control is a preset/custom hybrid** because `badge?: string` is
free-form. A plain dropdown would silently narrow what the type allows, so
"Custom…" reveals a text input. Switching from a preset carries the old value
across as the starting point.

**The draft store holds the whole `HomepageContent` object**, not one field per
section. `updateSection(key, value)` is generic over `keyof HomepageContent`, so
adding an editor needs no provider change. Section labels for the dirty banner
come from one `SECTION_LABELS` map keyed by the same union.

**Deleting a product also removes it from the rail.** `productRail.productIds`
references products by id, so leaving a deleted id behind would produce a
dangling reference. `removeProduct` prunes both.

**Reordering uses up/down buttons, not drag-and-drop.** No extra dependency, it
works with a keyboard and screen reader without custom ARIA, and these lists are
3–7 items. Worth revisiting only if a list grows past ~15 rows.

**`LinkListEditor` is shared by Navigation and Footer** — both edit `Link[]`. It
exposes the optional `external` flag, which is what the WhatsApp link needs to
open in a new tab.

### No schema fields have been added for the admin

Worth stating plainly, because it's the thing most likely to drift: **the admin
has never added a field to `data/types.ts`.** Every control binds to something
that already existed.

The one that looks like an addition is the "Opens outside the site" toggle on
Navigation and Footer links. It is backed by `external?: boolean` on the shared
`Link` interface, which **pre-dates the admin entirely** — it was authored with
the content layer and is consumed by `components/Footer.tsx`, which adds
`target="_blank" rel="noopener noreferrer"` when set. `data/homepage.ts` has
used `external: true` on the WhatsApp link since the footer was built.

Note also that there is no `NavLink` or `FooterLink` type — `nav.links` and
`footer.links` are both `Link[]`, which is exactly why one `LinkListEditor`
serves both.

The toggle writes `external: true` or removes the key (never stores `false`),
matching the field's optionality.

### Verification note

The banned-phrase audit (`copy-audit.mjs`) is run **against a freshly started
production server**. An early run in this phase reported all pages "clean" while
an old server instance was still bound to the port — the new routes were 404ing,
so the audit was scanning error pages.

The script now refuses to be fooled. Before scanning any page it requires:

1. HTTP status exactly **200** (the navigation response is checked, not discarded)
2. the page is **not** Next's not-found page
3. the `<h1>` **matches the heading that route should render** — this catches a
   stale build that happens to return 200 with different content

Any failure marks the route `FAILED`, skips scanning it, and exits non-zero with
"AUDIT INVALID — do not treat this run as a pass". On table pages it also
asserts the edit drawer actually opened, so drawer copy can't be silently
skipped. Both guards were verified against a dead port and against a live
server serving a 404.

## 17. Admin authentication

Single admin user, no accounts system. Credentials live in environment
variables and are never committed — see `.env.local.example`.

**Three env vars are required** (the brief named two; the third is inherent to
signing a session rather than issuing a guessable token):

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` | Sign-in username |
| `ADMIN_PASSWORD` | Sign-in password |
| `ADMIN_SESSION_SECRET` | HS256 key for the session JWT. **≥32 chars**; `lib/session.ts` throws on startup if it's missing or too short, rather than silently signing with a weak key. |

**Session.** On success the server issues a `jose` HS256 JWT (7-day expiry,
issuer + audience pinned) in a cookie that is `httpOnly`, `sameSite=lax`,
`path=/`, and `secure` in production. Verified in practice: `httpOnly: true`,
`sameSite: Lax`, `secure: true`, 7-day expiry, three-segment JWT.

**Password comparison is timing-safe.** `lib/credentials.ts` compares
**SHA-256 digests** with `crypto.timingSafeEqual`, not the raw strings.
Hashing first gives both sides a fixed 32 bytes — necessary because
`timingSafeEqual` throws on length mismatch, and that throw would itself leak
the length of the real secret. Username and password are both always compared,
so the work done doesn't depend on whether the username matched.

**Enforcement is in `middleware.ts`, not the UI.** A logged-out request to any
`/admin` route is redirected before any admin markup is generated, so nothing
flashes. Verified against five routes.

**Two modules, split by runtime.** `lib/session.ts` is `jose`-only with no
`node:` imports so it runs on the Edge runtime that middleware uses;
`lib/credentials.ts` imports `node:crypto` and must never be imported from
middleware.

**Route structure.** Dashboard pages moved under `app/admin/(dashboard)/`, which
owns the sidebar chrome. `/admin/login` sits outside that group, so it renders
without the shell and is exempt from the session check. The route group doesn't
change any URL. Signing in while already authenticated redirects to `/admin`.

**Error messages are deliberately generic.** One message covers every credential
failure and never indicates which field was wrong — distinguishing them would
confirm a valid username. A *different* message is shown when the server has no
credentials configured, since that's an operator problem, not a user error.

### Rate limiting is in-memory — interim only

`lib/rateLimit.ts` holds attempt counters in a module-level `Map`: 5 failures
per client locks that client out for 10 minutes, and a lockout refuses even
correct credentials. Verified: lockout triggers on attempt 5, and correct
credentials are refused while it's active.

**This will not hold up in production.**

- Serverless cold starts wipe the `Map`, resetting every counter.
- Multiple instances each keep their own copy, so the effective limit is
  5 × the number of instances.
- Restarting the server clears all lockouts — observed directly while testing.

**It must move to a shared persistent store (Vercel KV / Redis) when
persistence is wired up**, alongside the admin data layer (§15). Until then it
raises the cost of a naive brute-force without being a real control.

The client key comes from `x-forwarded-for` / `x-real-ip`, which is
spoofable unless the deployment guarantees those headers are set by a trusted
proxy. On Vercel they are; on any other host this needs checking.

## 18. Cinematic scroll — storefront only

The storefront is a scroll-driven editorial page: the scrollbar is the timeline.
GSAP ScrollTrigger drives the scenes, Lenis provides the momentum.

**Motion score** (the storyboard the build follows):

| Chapter | Scene |
|---|---|
| Hero | Pinned. Camera pulls back — photo settles and drifts up, copy lifts and fades, frame dims slightly as the story hands over. |
| Lookbook | Multi-depth parallax; alternating depths so the row reads with dimension rather than moving as one slab. |
| Brand statement | A slow camera move over a single portrait — small rotation only. |
| Product rail | Gentle lift, deliberately **no pin**: the eye needs to read prices here. |
| Trust strip | A quiet beat. Nothing moves. |
| Categories → footer | The environment has cooled to graphite; lights down. |

**Environment morph.** The homepage already encoded a journey in its backdrop
tokens (red studio → sunset → burnt orange → graphite). `EnvironmentMorph` lifts
that out of the photo panels and puts it behind the whole page as one continuous
low-opacity glow, scrubbed against document progress.

### Why it is NOT on `/admin`

The brief said "all the pages". The admin is deliberately excluded, and this is
a judgement call worth recording rather than a gap:

- Lenis hijacks the scroll position, which fights form focus, `scrollIntoView`,
  and the edit drawers' own scroll containers.
- Pinned chapters and scrubbed timelines in a data table or a settings form make
  the tool slower to use, not more impressive.
- It is an internal content manager, not a marketing surface — there is no story
  to tell with a camera.

`ScrollEngine` is therefore mounted by the storefront page, **never the root
layout**. Nothing under `/admin` imports gsap or lenis.

### Scenes wrap sections, they don't replace them

Each scene component takes server-rendered `children` and only animates them, so
§13 still holds: every section is a server component and the hero `<img>` is
still in the SSR HTML as the LCP element. The wrappers are client leaves.

**Every animated property starts at its natural CSS resting state.** That means
no `gsap.set()` on mount, and therefore no flash of an un-animated end-state
before JS runs — the classic tell of a bolted-on scroll library.

### Reduced motion

`ScrollEngine` never starts Lenis at all when `prefers-reduced-motion: reduce` —
scrolling stays entirely native. Each scene registers inside
`gsap.matchMedia("(prefers-reduced-motion: no-preference)")`, so reverting that
context restores the resting state. Verified: with reduce set, hero transform is
`none`, the environment colour never changes, no pin-spacer is created, and every
section is fully visible.

### Two things measurement caught that reading the code would not

1. **Dead air after the pin.** A 90% hold left ~350px of black between the hero
   releasing and the lookbook arriving. Measured the actual gap
   (pin-spacer bottom → first slide top), then shortened the hold to 55% desktop
   / 35% mobile so the next chapter is already arriving as the hero leaves.
2. **34px of horizontal overflow.** The 3D-rotated frame in the brand statement
   pushed its corners past the viewport edge. Fixed with `overflow-x: clip` on
   the tilt root — `clip` rather than `hidden` so no scroll container is created.

Mobile scales motion down rather than off: shorter pin, ~45% tilt, and
`syncTouch: false` so touch keeps the platform's own scrolling.

### Refinement pass — what was taken from reference sites, and what wasn't

Studied four scroll-driven sites (Lightweight, Moto Card, Otsuka /zeroz, Oryzo)
by driving them headlessly and sampling several scroll depths, rather than
reading about them.

**Taken, adapted:**

- **A chapter rail.** Lightweight runs a numbered section index down the left
  edge. Adapted rather than copied: their content column starts ~720px in, ours
  starts at a 64px gutter, so a labelled index *collided with the body copy and
  the CTA* on first build. Reduced to a tick rail at the far edge with only the
  active chapter named, set vertically — ~34px wide, verified zero collisions
  with any `main` text at 1440 and 1600.
- **Per-character headline reveal.** They use GSAP's SplitText; `lib/splitHeadline.ts`
  does the same job in our own code — no extra dependency, no licensed plugin —
  and keeps the accent (italic serif) flag attached per character.
- **Blueprint furniture.** Corner crosshairs, a measurement rule and a
  `FIG. 02 —` caption, borrowed from Lightweight's and Oryzo's technical marks.
  Pure server-rendered SVG at ~15–20% opacity: texture, not animation.

**Deliberately not taken:**

- **three.js / WebGPU** (Moto Card loads three + GLTFLoader across 3 canvases).
  There is no 3D asset here, and it would undo the LCP work in §13.
- **13–63 screens of scroll.** Otsuka runs ~49 screens with 25 sticky sections,
  Oryzo ~63. This is a shop, not a brand film — dead scroll between the hero and
  the products costs conversions. Ours stays at ~7 screens.

**Accessibility of the split text.** Splitting a headline into per-character
spans makes a screen reader announce it letter by letter. Each `RevealHeadline`
therefore exposes the real string once in an `sr-only` span and marks the split
markup `aria-hidden`. Verified: the accessible names are still
"OWN YOUR DIRECTION." and "BUILT FOR EVERY MOVE", and under reduced motion every
character renders fully visible and untransformed.

**The active chapter is computed, not triggered.** Giving each chapter its own
start/end ScrollTrigger produced overlapping ranges where whichever fired last
won — the rail read "04 The Kit" while Series 026 filled the screen. Replaced
with a single question asked against one line: which section contains the
viewport midpoint. Verified stepping cleanly 0→1→2→3→4 across the page.

---

## Known issues / follow-ups

- **Product imagery is doubled up.** There are only 5 photos in the Stitch
  export (3 model shots, 2 product shots) but the rail needs 5 cards, so three
  model shots stand in as product imagery. Swap in real product photography via
  `data/products.ts` — no component changes needed.
- ~~Images are unoptimised PNGs~~ — **resolved.** Converted to WebP at rest;
  see §12. Served assets went 6.39 MB → 0.23 MB.
- **LCP is still render-delay bound — the server/client refactor did not fix
  it.** §13 moved all seven section shells to server components and the hero
  image out of any client tree. Render delay medians moved 2254ms (n=1
  baseline) → 1727ms / 1902ms across two 5-run batches, but individual runs
  span 1685–2442ms, so the baseline sits *inside* the post-refactor range and
  **the improvement is not demonstrated.** LCP and Performance stayed flat
  within noise.

  The reason the win didn't materialise: client JS only went 183.0 → 181.1 KB.
  Framer Motion is still imported by every reveal leaf, so the library — the
  bulk of the bundle and of the hydration cost — never left the critical path.

  **The remaining lever is dropping Framer Motion from the scroll-reveal path**,
  replacing `Reveal`/`RevealGroup`/`RevealItem` with an IntersectionObserver +
  CSS-class approach (or `animation-timeline: view()` where supported). That
  would let most leaves stop importing the library entirely, leaving it only for
  the genuinely interactive pieces (`Navbar`, `CategoryRow`, `LookbookRail`,
  `PillButton`). Only attempt this with a **committed before/after baseline** so
  the result is measurable — see the noise note below.
- **Lighthouse scores here are very noisy.** Four 5-run batches across two
  builds gave Performance medians of 96, 94, 95, 94 with individual runs
  spanning 87–99 and LCP 2.27–3.92s. Treat anything under ~4 points as noise,
  always compare medians of ≥5 runs, and **commit before starting perf work** so
  a true before/after baseline can be measured on demand — the lack of one is
  why the §13 refactor's effect can't be quantified.
- **Admin rate limiting is in-memory and resets on restart** (§17). Move it to
  Vercel KV / Redis when persistence lands, or brute-force protection is
  effectively absent in a multi-instance deployment.
- **Bag state is a local stub.** `components/BagProvider.tsx` holds an in-memory
  count seeded to 2 so the navbar badge has a real source. It does not persist
  and is not a cart. Replace the internals with a real cart API; the `useBag()`
  consumer contract can stay.
- **WhatsApp support link is a placeholder** (`https://wa.me/919000000000` in
  `data/homepage.ts`). Needs the real business number before launch.
- **The hero renders two `<h1>` elements** — one for the mobile overlay, one for
  desktop — toggled with `hidden`/`lg:hidden`. Only one is ever in the
  accessibility tree at a time since `display: none` removes the other, so this
  is not an a11y defect, but it is duplication worth collapsing if the two
  layouts ever converge.
- **Nothing is wired to real routes.** All `href`s point at `/collections/*`,
  `/products/*`, `/bag`, `/wishlist` etc., none of which exist yet. Every link
  currently 404s. This also means the bottom nav's active state is untestable
  beyond `/` — the `layoutId` slide between items has never actually run.
- **Search is decorative.** The navbar search button has no handler; it is an
  icon with an `aria-label` and nothing behind it.
- **The homepage is the only route.** `app/page.tsx` is complete; there is no
  PLP, PDP, cart, or wishlist.
