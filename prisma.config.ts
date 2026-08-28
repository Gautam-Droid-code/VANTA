import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 moved the datasource URL out of `schema.prisma` and into this file,
 * which means the schema no longer has to be edited to point at a different
 * database — and no longer carries a credential-shaped string in git.
 */

/**
 * The CLI does not read `.env.local`; Next does. Without this, a DATABASE_URL
 * that works for the app is invisible to `prisma migrate`, and the CLI reports
 * a missing variable that is sitting right there in the file.
 *
 * `.env` last and without override, so an explicitly exported shell variable
 * still beats both files — which is how CI and one-off migrations against a
 * different database are run.
 */
loadEnv({ path: ".env.local" });
loadEnv();

/**
 * Migrations run against `DIRECT_DATABASE_URL` when it is set.
 *
 * On a pooled host (Neon, Supabase, PgBouncer in transaction mode) the pooled
 * connection cannot hold the advisory lock a migration takes, and
 * `prisma migrate` either hangs or fails with an error that does not mention
 * pooling. The app itself still uses the pooled `DATABASE_URL` — see
 * `lib/db.ts`.
 */
const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

/**
 * Read with `process.env` rather than Prisma's `env()` helper, which throws on
 * a missing variable instead of returning undefined — so `a ?? b` never
 * reaches `b`, and the whole config fails to load.
 *
 * That mattered more than it sounds: `npm run build` runs `prisma generate`
 * first, and generating a client needs no database at all. A config that
 * refuses to load without one made the database a requirement for building the
 * site, which is exactly what `hasDatabase()` exists to avoid. With no URL set
 * the datasource is simply omitted; `generate` succeeds, and the commands that
 * genuinely need a connection fail on their own with their own message.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
});
