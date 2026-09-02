# Deploying VANTA

A pre-deploy checklist. Written for the Vercel case because that is the target,
but everything except the Blob/cron notes applies anywhere.

Read this top to bottom the first time. The three things that most commonly go
wrong are called out with `> [!WARNING]`, and one of them will lock you out of
`/admin` in front of whoever you are demoing to.

---

## 1. The environment

`.env.local.example` is the full annotated list and stays the reference. This is
the shorter question: **what is the minimum for a working demo, and what should
be left unset on purpose?**

### Required — the site is broken or unreachable without these

| Variable | Why |
|---|---|
| `DATABASE_URL` | Pooled connection. Without it there are no accounts, no orders, no checkout, and content falls back to the `/data` seed. |
| `DIRECT_DATABASE_URL` | Unpooled, for `prisma migrate` only. Needed wherever the two differ (Neon, Supabase, PgBouncer) — a transaction-mode pooler cannot hold the advisory lock a migration takes. |
| `ADMIN_USERNAME` | Sign-in at `/admin/login`. |
| `ADMIN_PASSWORD` | Sign-in at `/admin/login`. Use something long. |
| `ADMIN_SESSION_SECRET` | **At least 32 characters.** Signs the admin session *and* the guest order links — `lib/orders.ts` throws if it is missing or short, so checkout breaks too, not just the admin. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | The captcha widget on `/admin/login`. See the warning below. |
| `TURNSTILE_SECRET_KEY` | Verifies it. See the warning below. |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` — no trailing slash. See §3. |

Generate the two secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> [!WARNING]
> **An unset `TURNSTILE_SECRET_KEY` locks you out of `/admin` completely.**
>
> This is the single most likely way to be stuck in front of a client, and it is
> deliberate rather than a bug. `/admin/login` **fails closed**: with no captcha
> configured it refuses *every* sign-in and says
> *"Sign-in isn't available: this server has no captcha configured."* — correct
> credentials included. There is no bypass, because an admin login that silently
> drops its captcha the moment an environment variable goes missing is worse
> than one that never had it: everything keeps working and nobody finds out.
>
> The customer forms behave the **opposite** way — `verifyTurnstileIfConfigured`
> returns `{ ok: true, reason: "skipped-unconfigured" }`, so sign-up and sign-in
> still work without Turnstile. The asymmetry is intentional (§17, §25); do not
> "fix" it by making the admin match.
>
> Both keys are needed, not just the secret: without the public site key the
> widget never renders, so there is no token to verify.
>
> Turnstile keys are free from the Cloudflare dashboard and take two minutes.
> If you are locked out *right now* and need in, Cloudflare publishes an
> always-passing test pair:
>
> ```
> NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
> TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
> ```
>
> Those make the captcha decorative. Use them to get unstuck, then replace them
> — do not leave them on a public URL.

### Leave unset for a demo, on purpose

Everything here degrades honestly. Nothing 500s, and the storefront says what is
unavailable rather than pretending.

| Variable(s) | What happens when unset |
|---|---|
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Checkout offers cash on delivery only, and the "Pay online" option says card and UPI are not connected. Orders are still placed and recorded. |
| `SHIPROCKET_*` | Orders are taken and recorded as normal. The pincode check says it cannot check right now, and courier pushes queue in `/admin/orders` until credentials exist. Nothing blocks a sale — that is the §27 rule. |
| `SHIPROCKET_WEBHOOK_TOKEN` | The courier webhook refuses every request rather than accepting unauthenticated ones. |
| `SECRET_ENCRYPTION_KEY` | Safe. The Shiprocket token cache is skipped rather than downgraded to plaintext, so it just logs in more often. Only matters once Shiprocket is connected. |
| `CRON_SECRET` | `/api/courier/sync` refuses everything. Correct while there is no scheduler — see §4. |

> [!WARNING]
> **Photo uploads do not survive a deploy yet.**
>
> `lib/mediaStore.ts` writes to `.content/uploads/` on the local disk. On Vercel
> that filesystem is ephemeral: the upload appears to succeed and the file is
> gone on the next deploy. Images that ship in `public/images` are fine — this
> only affects photos added through `/admin` → Photos.
>
> For a demo, either avoid uploading, or accept that anything you upload is
> temporary. This is the last real Vercel blocker and is tracked in
> "Known issues".

---

## 2. Before you push

```bash
npm run predeploy
```

Runs ESLint and `content:check-links`, which walks every internal link in the
**published** content and fails on any that 404s.

That check exists because a dead link on the homepage shipped twice — and the
second time only because the first fix edited `/data`, which is the seed and not
what a published site reads (§31). It is now wired into `vercel.json`'s
`buildCommand`, so a Vercel deploy runs it automatically and a dead link fails
the build rather than reaching a client. Running it locally first just saves you
the round trip.

Also worth running once:

```bash
npm run build
```

---

## 3. `NEXT_PUBLIC_SITE_URL` is read at **build** time

`NEXT_PUBLIC_*` values are inlined into the bundle when the site is built, not
when it is served. Setting this variable after a build and restarting changes
nothing.

If it is missing at build time, `lib/siteUrl.ts` falls back to
`http://localhost:3000` and `siteUrlIsPlaceholder` becomes true, which
deliberately degrades three things rather than shipping localhost URLs to
crawlers:

- `robots.txt` omits its `Sitemap:` line
- `sitemap.xml` returns **empty**
- Breadcrumb JSON-LD is not emitted

The storefront itself works fine. Canonicals and share images will point at
localhost, which is why this is on the required list. On Vercel,
`VERCEL_PROJECT_PRODUCTION_URL` is detected automatically, so the variable is
only strictly needed on a custom domain — but set it explicitly anyway, because
preview deployments otherwise canonicalise to the production URL.

**Verify after deploying:**

```bash
curl -s https://your-domain/robots.txt | grep Sitemap
curl -s https://your-domain/sitemap.xml | grep -c "<url>"
```

The first must print a `Sitemap:` line on your real domain; the second must
print a number well above zero (59 with the current catalogue).

---

## 4. No cron is configured

`vercel.json` used to declare `/api/courier/sync` at `*/15 * * * *`. It is gone,
because **Hobby accounts are limited to once-daily crons** and anything more
frequent fails at deploy time, not at run time:

> Hobby accounts are limited to daily cron jobs. This cron expression would run
> more than once per day.

Confirmed against Vercel's current docs (`/docs/cron-jobs/usage-and-pricing`):
Hobby is *once per day* with *per-hour* precision — a job set for 01:00 fires
somewhere between 01:00 and 01:59. Pro and Enterprise allow once per minute.

Nothing is broken by its absence. The sync is a **safety net**, not the primary
path: Shiprocket's tracking webhook does the real work, and staff can drain the
push queue by hand from `/admin/orders`. See DECISIONS §27.

Three ways forward, in increasing order of cost:

1. **Leave it off** — correct for a demo, and what ships today.
2. **A daily cron on Hobby.** Permitted, and better than nothing for a safety
   net whose job is catching a webhook that went missing. Add back to
   `vercel.json`, remembering `CRON_SECRET` or the route refuses the call:

   ```json
   "crons": [{ "path": "/api/courier/sync", "schedule": "0 3 * * *" }]
   ```

3. **Pro, or an external scheduler.** Only worth it once tracking freshness
   matters to a real customer.

---

## 5. Release

1. **Set the environment** (§1), in the Vercel project settings, for the
   environments you are deploying — not just Production, or preview builds get
   the placeholder-URL behaviour from §3.

2. **Run migrations.** The build does *not* do this.

   ```bash
   npm run db:deploy
   ```

   Applies `prisma/migrations/` to `DIRECT_DATABASE_URL`. Never use
   `prisma db push` — see the warning in `README.md`; a schema only ever pushed
   is a schema a fresh production database knows nothing about.

   Adopting a database that was previously `db push`-ed? It has the tables but
   no migration bookkeeping, so tell Prisma the baseline is already applied,
   once:

   ```bash
   npx prisma migrate resolve --applied 20260831000939_init
   ```

3. **Deploy.** The build command in `vercel.json` runs `predeploy` then `build`.

4. **Carry content across, if there is any.** Only if `/admin` has published on
   the machine you are deploying from — otherwise skip it; the site falls back
   to the `/data` seed, which is a complete catalogue.

   ```bash
   npm run content:import
   ```

   Without this, a Postgres content store starts empty and the site serves the
   seed, which looks exactly like every edit ever made was lost.

5. **Smoke test**, in this order — each one fails differently:

   ```bash
   curl -sI https://your-domain/                     # 200, no X-Powered-By
   curl -s  https://your-domain/robots.txt           # Sitemap: line present
   curl -so /dev/null -w '%{http_code}\n' \
        https://your-domain/no-such-page             # 404, not 200
   ```

   Then in a browser: sign in at `/admin/login` (the Turnstile warning above is
   about this step), open a product page, add to bag, and complete a cash-on-
   delivery checkout. That last one exercises the database, the order writer and
   the guest order link in one pass.

---

## Related

- `README.md` — running locally, the content store, schema changes
- `.env.local.example` — every variable, annotated
- `DECISIONS.md` — why any of this is the way it is; §27 for payments and
  courier, §31 for the published-vs-seed trap, "Known issues" for what is still
  outstanding
