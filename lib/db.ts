/**
 * The Prisma client, and the answer to "is there a database at all".
 *
 * Server-only, for the same reason `lib/contentStore.ts` is: importing it from
 * a client component must be a build error naming this file rather than a
 * native module quietly ending up in the browser bundle.
 */
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * True when the app is configured to talk to Postgres.
 *
 * The site is designed to boot without one — the catalogue is a JSON document
 * and the bag is browser-local — so the database is a capability, not a
 * requirement. Accounts and server-side bags are switched off when this is
 * false, rather than crashing every page. Anything that genuinely cannot work
 * without a database says so in its own words.
 */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * One client per process, reused across hot reloads.
 *
 * `next dev` re-evaluates modules on every edit. Without the global, each
 * reload would open a fresh pool and the database would run out of
 * connections after a few minutes of editing.
 */
const globalForPrisma = globalThis as unknown as { vantaPrisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Reached only by something that ignored `hasDatabase()`. Name the variable
    // — "connection refused" three frames deep is not a useful error.
    throw new Error(
      "DATABASE_URL is not set. Accounts, saved bags and the Postgres content store need it. See .env.local.example.",
    );
  }

  return new PrismaClient({
    // The driver adapter talks to Postgres over plain TCP through `pg`. Point
    // DATABASE_URL at the *pooled* connection string on a serverless host:
    // every request is potentially its own process, and a direct connection
    // per request exhausts the server's limit long before traffic does.
    adapter: new PrismaPg({ connectionString }),
  });
}

/**
 * Created on first use rather than at import time, so a build or a page that
 * never touches the database doesn't require one to exist.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = (globalForPrisma.vantaPrisma ??= createClient());
    const value = Reflect.get(client, property) as unknown;
    // Methods are bound to the real client. Handing back an unbound function
    // would call it with the proxy as `this`, and Prisma reads private fields
    // off `this` — the failure is a null dereference inside the client rather
    // than anything that points here.
    return typeof value === "function" ? value.bind(client) : value;
  },
});
