# VANTA

Homepage for VANTA — a men's technical streetwear brand based in Mumbai.
Dark editorial aesthetic, mobile-first, built to feel fast on Indian mobile
networks.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS 3** for styling
- **Framer Motion 11** for animation
- **next/font** — Archivo 900 (display), Playfair Display Italic 400 (accent),
  Inter variable (body). Each family loads **only the weights actually
  rendered**; adding a weight to `app/fonts.ts` adds a font file to the critical
  path, so add one only when something really uses it.

Requires **Node 20.9+** (see `.nvmrc`).

## Getting started

```bash
npm install
```

Copy the example env file and fill in real values — `/admin` won't let you in
without them:

```bash
cp .env.local.example .env.local
```

| Variable | What it's for |
|---|---|
| `ADMIN_USERNAME` | Username for signing in at `/admin/login` |
| `ADMIN_PASSWORD` | Password for signing in. Use something long and random. |
| `ADMIN_SESSION_SECRET` | Signs the admin session cookie. **Must be ≥32 characters** — the app throws on startup if it isn't. |
| `NEXT_PUBLIC_SITE_URL` | The site's public address, used to build share-preview links. Optional in development and on Vercel; **required elsewhere before launch**, or WhatsApp and search previews point at the wrong host. No trailing slash. |
| `DATABASE_URL` | Postgres, **pooled** connection string. Powers customer accounts, sessions, saved bags and the address book. Optional — the site runs without it. |
| `DIRECT_DATABASE_URL` | The unpooled connection, used only by `prisma migrate`. Optional locally. |
| `CONTENT_STORE_DRIVER` | `postgres` or `file`. Defaults to `postgres` when `DATABASE_URL` is set. |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`.env.local` is gitignored and must never be committed. Changing
`ADMIN_SESSION_SECRET` signs everyone out immediately.

```bash
npm run dev
```

Then open http://localhost:3000.

| Script | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run db:migrate` | Create and apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (what a deploy runs) |
| `npm run db:studio` | Browse the database in Prisma Studio |
| `npm run content:import` | Copy `.content/site.json` into Postgres, once |

## Project structure

```
app/          Routes, root layout, global styles, font definitions
components/   UI components — presentational, render whatever data they're given
  hero/       Hero's client leaves (headline reveal, copy fade)
  ui/         Shared primitives (Headline, PillButton, Reveal, Icons)
data/         All site content as typed objects — the single source of truth
lib/          Utilities: motion variants, formatters, hooks
  auth/       Customer passwords, sessions, and the saved bag/wishlist
  generated/  Prisma client — generated, gitignored, never edited
prisma/       Database schema and migrations
public/       Served static assets — images here are WebP only
assets-src/   Original full-size source images, never served
```

### Server vs client components

**Section components are server components. Only the bits that actually animate
are client components** — wrap server-rendered markup in `Reveal`,
`RevealGroup`, or `RevealItem` from `components/ui/Reveal.tsx` rather than
putting `"use client"` at the top of a section.

```tsx
// Server section — no "use client"
<RevealGroup className="...">
  {items.map((item) => (
    <RevealItem key={item.id}>
      <Card item={item} />   {/* also a server component */}
    </RevealItem>
  ))}
</RevealGroup>
```

`RevealItem` intentionally has no scroll trigger of its own — it inherits the
group's, which is what produces the stagger. Importing from `lib/motion.ts`
doesn't force a component client-side; only rendering a `motion.*` element does.
Full rationale and the current server/client split are in `DECISIONS.md` §13.

### Adding an image

**From the admin:** every image field has an **Upload photo** button. The file is
converted to WebP, capped at 2400px on its longest edge, stripped of metadata,
and stored under `.content/uploads/`, served from `/media/<id>`. Uploads are
saved immediately — they do not wait for "Publish changes".

**As a committed asset** (for imagery that should live in the repo):
`/public/images` is WebP-only. Convert first, keep the original in
`/assets-src/images`, then reference the `.webp` from `/data`:

```bash
npx sharp-cli --input assets-src/images/new-shot.png --output public/images/ --format webp --quality 82
```

The two are deliberately separate. `/public` is a curated, build-time asset
directory; uploads are runtime data and stay out of it.

## Editing content

**All copy, imagery, products, and links live in `/data`.** You should not need
to touch a component to change what the homepage says.

- [`data/homepage.ts`](data/homepage.ts) — every homepage section: nav, hero,
  lookbook, brand statement, product rail, trust strip, categories, footer
- [`data/products.ts`](data/products.ts) — product catalogue (prices in whole
  rupees; formatting happens at render time)
- [`data/categories.ts`](data/categories.ts) — category rows
- [`data/types.ts`](data/types.ts) — the schema everything above conforms to

Two conventions are worth knowing before you edit:

**Headlines are structured, not strings.** A headline is a list of lines, each a
list of segments. Mark a segment `accent: true` to render it in the italic
serif:

```ts
headline: [
  [{ text: "MADE " }, { text: "to move.", accent: true }],
  [{ text: "BUILT " }, { text: "to", accent: true }, { text: " STAND OUT." }],
]
```

**Backdrops are named moods, not colours.** Set `backdrop` to `"red"`,
`"orange"`, `"sunset"`, or `"graphite"`; the component maps it to the right
gradient. Don't put hex values in `/data`.

## Design tokens

Defined in [`tailwind.config.ts`](tailwind.config.ts):

| Token | Value | Use |
|---|---|---|
| `ink` | `#0D0D0D` | Page background (plus `soft` / `raised` / `line` tones) |
| `bone` | `#F5F5F0` | Foreground text (plus `dim` / `faint`) |
| `flare-red` / `flare-orange` | `#C41E1E` / `#E8590C` | Photo backdrops only — never flat UI chrome |

The **storefront** additionally runs a scroll-driven layer — GSAP ScrollTrigger
scenes over Lenis smooth scroll (pinned hero, parallax, a scroll-linked camera
move, and an environment morph). It is mounted by the storefront page only and
is **deliberately absent from `/admin`**, where smooth-scroll hijacking would
fight forms and drawers. See `DECISIONS.md` §18.

Motion tokens (easings, durations, variants) live in
[`lib/motion.ts`](lib/motion.ts). Use them rather than writing inline
transitions — see `DECISIONS.md` §2.

Much of the palette is off-white at reduced opacity over near-black. **Measure
contrast before introducing a new muted tone below ~40% opacity** — see
`DECISIONS.md` §10 for the current measured values and why.

## Admin dashboard

A content manager for non-technical staff lives at **`/admin`**. It edits the
same `/data` shapes the storefront renders — every form field maps to a real
field in [`data/types.ts`](data/types.ts).

**Sign in at `/admin/login`** with `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Every
`/admin` route is gated by `middleware.ts`, so a direct URL visit while signed
out redirects rather than flashing content. Sessions last 7 days; "Sign out"
sits next to the profile chip in the top bar. Auth architecture and the
in-memory rate-limit caveat are in `DECISIONS.md` §17.

```
app/admin/            Admin routes (Overview, Homepage Sections, Products, Categories)
components/admin/     Admin-only components
  ui/                 Form + surface primitives (Button, Field, TextInput, …)
```

Built so far:

- **Overview** — stats, hero preview, unpublished-changes prompt
- **Homepage Sections** — Hero, Lookbook, Brand Statement, Product Rail, Trust
  Strip, Navigation, Footer (one per key of `HomepageContent`)
- **Products** and **Categories** — table plus slide-in edit drawer

Hero and Brand Statement share one `SectionEditor`. Photos & Images and Settings
appear in the sidebar marked "Soon".

**Changes persist.** "Publish changes" validates the draft and writes it to the
content store, and the storefront reads from that store rather than importing
`/data`. `/data` is the store's *seed*: it supplies the content until something
is published for the first time.

> [!IMPORTANT]
> The default store is a **JSON file** at `.content/site.json` (gitignored,
> override with `CONTENT_STORE_PATH`). It needs a writable disk, so it works in
> development and on a normal server or container but **not on a read-only
> serverless filesystem such as Vercel's.** Deploying there means writing one
> more `ContentStore` adapter — nothing else changes. See `DECISIONS.md` §15.

Admin uses a **separate visual system** from the storefront: `admin-*` colour
tokens, a dark sidebar, a light workspace, and one orange accent. Don't use
`admin-*` tokens in storefront code or storefront tokens (`ink`, `bone`,
`flare`) in admin code — see `DECISIONS.md` §14 and §16.

## Customer accounts

Shoppers can create an account at **`/account/register`**, sign in at
**`/account/login`**, and manage their saved addresses at **`/account`**. This
is entirely separate from `/admin`, which is still one username and password in
the environment — the admin is infrastructure, customers are data.

It needs Postgres. Point `DATABASE_URL` at a database, then:

```bash
npm run db:migrate     # creates the tables
```

Without `DATABASE_URL` the storefront runs exactly as before: the catalogue
comes from the JSON content store, the bag stays browser-local, and the account
pages report that accounts aren't available. Nothing crashes.

### How the bag survives a new phone

**localStorage stays the authority; the account is a mirror.** The bag and
wishlist keep working signed out, offline, and before any JavaScript has
spoken to the server — that does not change. What signing in adds is a second
copy in Postgres, kept in step by `components/AccountSync.tsx`:

- **At sign-in, and on every page load while signed in**, the two are merged
  once. On a quantity clash **the larger wins, never the sum** — the common
  case is one person adding the same jacket on a laptop and then on a phone,
  and that person wants one jacket.
- **After every change**, the whole list is pushed to the server, debounced,
  and flushed when the tab is hidden.

A failed sync is never surfaced: the bag on screen is correct either way, and
the next change re-sends everything.

### Sessions

Customer sessions are **rows in `CustomerSession`**, not self-contained tokens
— which is what makes "sign out" and "sign out everywhere" revoke something
real. The cookie holds a random opaque token; only its SHA-256 digest is
stored, so a leaked database dump cannot be replayed as a login. Passwords are
scrypt from `node:crypto` — memory-hard, no native addon to build, works
unchanged on a serverless runtime.

The admin's session is still a stateless JWT (`lib/session.ts`), and
deliberately so: it is one person on one laptop, checked in middleware that
must not touch a database.

### Deploying to Vercel

The `> [!IMPORTANT]` note above about the JSON content store no longer applies
once `DATABASE_URL` is set: content moves to the `ContentDocument` table and
the read-only filesystem stops mattering. **Uploaded images still write to
`.content/uploads/`** and still need a writable disk — that is the remaining
piece to move before a Vercel deploy is complete.

If `/admin` has published anything on this machine, carry it across once:

```bash
npm run content:import
```

Set the build command to `npm run build` (it runs `prisma generate` first, and
the generated client is gitignored) and run `npm run db:deploy` as part of
releasing.

## Further reading

[`DECISIONS.md`](DECISIONS.md) records architecture decisions, the Next 14 → 16
upgrade notes, and the current list of known issues and follow-ups.
