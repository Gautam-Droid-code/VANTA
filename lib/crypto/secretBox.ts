import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Authenticated encryption for secrets that must be **replayed**, not checked.
 *
 * Everything else this codebase stores is one-way: admin passwords go through
 * scrypt, customer session tokens and Turnstile tokens are kept as SHA-256
 * digests. That works because those are only ever *compared*.
 *
 * A Shiprocket bearer token is different — it has to be sent back to
 * Shiprocket verbatim, so a digest is useless and the value itself must
 * survive. AES-256-GCM is the answer: encrypted at rest under a key that lives
 * in the environment rather than the database, and authenticated so a tampered
 * ciphertext fails loudly instead of decrypting to garbage.
 *
 * ## What this does and does not buy
 *
 * It defends against **database-only** compromise: a leaked backup, an
 * over-broad read grant, a dump pulled through an injection. In those cases
 * the ciphertext is inert without the key.
 *
 * It does **not** defend against an attacker who has the environment. They
 * would have `SHIPROCKET_PASSWORD` too and could simply log in. That is worth
 * stating plainly rather than implying more: the two leak through different
 * channels, and closing the more common one is the whole of the win.
 *
 * ## Why key management is cheap here specifically
 *
 * The usual objection to encrypting a column is the key lifecycle — rotation
 * means re-encrypting existing rows, and losing the key means losing data.
 * Neither applies. Every value protected by this module is a **cache of
 * something re-derivable**. A missing key, a rotated key, or a corrupt payload
 * all resolve the same way: throw the row away and fetch a fresh token. That
 * is one extra login, not a data-loss event, which is why this is a complete
 * design rather than the first half of one.
 */

const ALGORITHM = "aes-256-gcm";
/** 96 bits, the size GCM is specified and optimised for. */
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** Marks the format so a future scheme can be told apart from this one. */
const PREFIX = "v1";

export function isSecretBoxConfigured(): boolean {
  return readKey() !== null;
}

/**
 * The key, or null.
 *
 * Required to be exactly 32 bytes, supplied base64 or hex encoded. A
 * passphrase is deliberately not accepted: stretching one with a fixed salt
 * looks like key derivation while providing very little of it, and an
 * operator who believes they have a strong key when they do not is worse off
 * than one who is told to generate a real one.
 */
function readKey(): Buffer | null {
  const raw = process.env.SECRET_ENCRYPTION_KEY?.trim();
  if (!raw) return null;

  for (const encoding of ["base64", "hex"] as const) {
    try {
      const key = Buffer.from(raw, encoding);
      if (key.length === KEY_BYTES) return key;
    } catch {
      // Try the next encoding.
    }
  }
  return null;
}

/**
 * Encrypts, or returns null when no key is configured.
 *
 * Null is a real answer, not a failure: callers treat "cannot encrypt" as
 * "do not persist". Falling back to writing the plaintext would defeat the
 * entire point, and it is exactly the kind of silent downgrade that leaves a
 * credential sitting in a column nobody thinks to look at.
 */
export function encryptSecret(plaintext: string): string | null {
  const key = readKey();
  if (!key) return null;

  // A fresh IV per encryption. Reusing one under the same key is the single
  // way to break GCM outright, so it is generated here and never passed in.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(
    ".",
  );
}

/**
 * Decrypts, or returns null for anything that is not a valid payload under the
 * current key — wrong key, tampered ciphertext, an older format, no key at all.
 *
 * One null for every failure on purpose. The caller's response is identical in
 * every case (discard and re-fetch), and distinguishing "wrong key" from "bad
 * tag" in a return value invites a caller to branch on it, which is how a
 * decryption oracle gets built by accident.
 */
export function decryptSecret(payload: string): string | null {
  const key = readKey();
  if (!key) return null;

  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== PREFIX) return null;

  try {
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const ciphertext = Buffer.from(parts[3], "base64");
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) return null;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    // Set before `final()`, which is where GCM verifies it and throws on a
    // mismatch. That throw is the authentication check working.
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
