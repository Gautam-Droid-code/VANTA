import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Customer password hashing.
 *
 * scrypt from `node:crypto` rather than bcrypt or argon2, because both of
 * those are native addons: they need a build toolchain on install and a
 * matching binary on the deploy target, and neither buys anything here that
 * scrypt does not already give. scrypt is memory-hard, it is in the standard
 * library, and it works unchanged on a serverless Node runtime.
 *
 * The admin password is *not* handled here — it is an environment variable
 * compared in `lib/credentials.ts`. There is one of it, it is rotated by
 * editing the environment, and there is nothing to store.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Cost parameters. N=2^15 puts a single hash at roughly 100ms on a modern
 * server, which is the point: slow enough that guessing at scale is
 * uneconomic, fast enough that signing in feels instant.
 *
 * They are written into every stored hash, so raising them later does not
 * invalidate existing passwords — old hashes keep verifying with the numbers
 * they were made with.
 */
const N = 32768;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/** scrypt needs ~128 * N * r bytes; Node's default cap is below that at N=2^15. */
const MAX_MEMORY = 128 * N * R * 2;

/**
 * `scrypt$N$r$p$salt$hash`, salt and hash base64.
 *
 * Self-describing on purpose. A bare digest is a hash you can never migrate:
 * nothing in it says how it was made, so the first parameter change means
 * every stored password becomes unverifiable.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAX_MEMORY,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verify. Returns false for anything malformed rather than
 * throwing — a corrupt row must read as "wrong password", not as a 500 that
 * tells the caller the row exists.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const derived = await scrypt(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });

    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
