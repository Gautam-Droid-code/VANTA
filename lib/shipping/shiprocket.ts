import "server-only";

import { hasDatabase, prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secretBox";

/**
 * Shiprocket.
 *
 * Built against their live API documentation (apidocs.shiprocket.in and the
 * Postman collection it publishes), read while writing this file rather than
 * recalled. The shapes below are theirs, verbatim:
 *
 * - `POST /v1/external/auth/login` — `{ email, password }`, returns a bearer
 *   `token`. Their helpsheet states the token is "valid for 240 hours(10
 *   days)", which is the whole reason for the cache below.
 * - `GET /v1/external/courier/serviceability/` — query params
 *   `pickup_postcode`, `delivery_postcode`, `cod` (1 or 0), `weight` (kg), and
 *   optionally `declared_value`. Responds with
 *   `data.available_courier_companies[]`, each carrying `courier_name`,
 *   `rate`, `etd`, `estimated_delivery_days`, `cod`, `courier_company_id`.
 * - `POST /v1/external/orders/create/adhoc` — the long flat payload built in
 *   `buildOrderPayload` below. Responds with `order_id`, `shipment_id`,
 *   `status`, and `awb_code` / `courier_name` (both null at creation).
 * - `POST /v1/external/courier/assign/awb` — `{ shipment_id }`, responds with
 *   `response.data.awb_code` and `response.data.courier_name`.
 * - `GET /v1/external/courier/track/awb/{awb}` — responds with
 *   `tracking_data.shipment_track[]` and `tracking_data.shipment_track_activities[]`.
 *
 * ## Everything here fails soft
 *
 * Not one function in this file throws on a network error, a non-2xx, or a
 * response it does not understand. They all return a discriminated result and
 * let the caller carry on.
 *
 * The reason is a single rule: **Shiprocket being down must never stop an
 * order.** A courier is a supplier, and a supplier's uptime is not the
 * customer's problem. So an order is written to our database first and pushed
 * to Shiprocket second, out of band, through the outbox in `lib/outbox.ts`; a
 * failed push leaves a job that retries with backoff and an error the admin
 * can see. Pincode checks degrade to "we couldn't check right now" rather than
 * blocking the bag. Nothing in the buying path waits on this file.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

/** Long enough for their slower endpoints, short enough not to hang a job. */
const TIMEOUT_MS = 15_000;

export type ShipResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function isShiprocketConfigured(): boolean {
  return Boolean(
    process.env.SHIPROCKET_EMAIL &&
      process.env.SHIPROCKET_PASSWORD &&
      process.env.SHIPROCKET_PICKUP_LOCATION,
  );
}

/** The warehouse a shipment leaves from. Their rate card starts here. */
function pickupPincode(): string | null {
  return process.env.SHIPROCKET_PICKUP_PINCODE?.trim() || null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * A day of headroom on their 10-day token.
 *
 * Refreshing early is free; refreshing late means a job fails with a 401 and
 * waits out a backoff before anyone notices.
 */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

/**
 * Within one process, avoid even the database round trip. This is a cache in
 * front of a cache, and it is the row in Postgres — not this — that stops a
 * fresh serverless instance logging in again.
 */
let memoToken: { token: string; expiresAt: number } | null = null;

async function login(): Promise<ShipResult<string>> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return { ok: false, error: "not-configured" };

  try {
    const response = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, error: `login-http-${response.status}` };

    const body = (await response.json()) as { token?: unknown };
    if (typeof body.token !== "string" || !body.token) {
      return { ok: false, error: "login-no-token" };
    }
    return { ok: true, value: body.token };
  } catch {
    return { ok: false, error: "login-unreachable" };
  }
}

/**
 * The current bearer token, logging in only when there isn't a usable one.
 *
 * Their documentation is explicit that a token lasts ten days, and their login
 * endpoint is rate limited — so a login per request is not a performance
 * detail, it is a way to get the account locked out during a traffic spike.
 * The cache is three deep: this process, then the `IntegrationToken` row, then
 * an actual login.
 */
export async function getToken(): Promise<ShipResult<string>> {
  const now = Date.now();

  if (memoToken && memoToken.expiresAt > now) {
    return { ok: true, value: memoToken.token };
  }

  if (hasDatabase()) {
    const stored = await prisma.integrationToken
      .findUnique({ where: { provider: "shiprocket" } })
      .catch(() => null);

    if (stored && stored.expiresAt.getTime() > now) {
      /**
       * Null covers every way a stored token can be unusable: no encryption
       * key configured, the key was rotated, the row was tampered with, or the
       * payload predates the current format.
       *
       * All of them are handled by ignoring the row and logging in again,
       * which is the whole reason encrypting this column carries none of the
       * usual key-management cost — see `lib/crypto/secretBox.ts`. The one
       * thing that must never happen is treating an undecryptable value as a
       * token and sending it to Shiprocket.
       */
      const plaintext = decryptSecret(stored.tokenCiphertext);
      if (plaintext) {
        memoToken = { token: plaintext, expiresAt: stored.expiresAt.getTime() };
        return { ok: true, value: plaintext };
      }
    }
  }

  const fresh = await login();
  if (!fresh.ok) return fresh;

  const expiresAt = new Date(now + TOKEN_TTL_MS);
  memoToken = { token: fresh.value, expiresAt: expiresAt.getTime() };

  /**
   * Persisted only if it can be encrypted.
   *
   * With no SECRET_ENCRYPTION_KEY the row is simply not written — the process
   * memo above still works, so the only cost is one login per cold start.
   * Writing the plaintext instead would be a silent downgrade of exactly the
   * property this is here to provide.
   */
  const ciphertext = encryptSecret(fresh.value);

  if (hasDatabase() && ciphertext) {
    // Best effort. A token that could not be persisted is still a usable token
    // for this process; the only cost is another login on the next cold start.
    await prisma.integrationToken
      .upsert({
        where: { provider: "shiprocket" },
        create: { provider: "shiprocket", tokenCiphertext: ciphertext, expiresAt },
        update: { tokenCiphertext: ciphertext, expiresAt },
      })
      .catch(() => {});
  }

  return { ok: true, value: fresh.value };
}

/** Forces the next call to log in. Used when Shiprocket answers 401. */
async function invalidateToken(): Promise<void> {
  memoToken = null;
  if (!hasDatabase()) return;
  await prisma.integrationToken
    .deleteMany({ where: { provider: "shiprocket" } })
    .catch(() => {});
}

/**
 * An authenticated request, retried exactly once on a 401.
 *
 * The retry exists because a cached token can be revoked on their side — a
 * password change, an API user deleted — and the only way to find out is a
 * 401. Retrying once turns that into a transparent re-login instead of a job
 * that fails every ten days for a week.
 */
async function call<T>(
  path: string,
  init: RequestInit,
  retriedAfter401 = false,
): Promise<ShipResult<T>> {
  const token = await getToken();
  if (!token.ok) return token;

  try {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token.value}`,
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (response.status === 401 && !retriedAfter401) {
      await invalidateToken();
      return call<T>(path, init, true);
    }

    if (!response.ok) {
      // Their error bodies carry a `message` worth surfacing to the admin, but
      // the shape varies by endpoint, so it is read defensively.
      const text = await response.text().catch(() => "");
      return { ok: false, error: `http-${response.status}${text ? `: ${text.slice(0, 200)}` : ""}` };
    }

    return { ok: true, value: (await response.json()) as T };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

// ---------------------------------------------------------------------------
// Serviceability
// ---------------------------------------------------------------------------

export interface ServiceabilityQuote {
  serviceable: boolean;
  courierName: string | null;
  /** Rupees, as they return it. Display only — we do not charge this. */
  rate: number | null;
  /** Their `etd`, e.g. "Jul 01, 2024". A string because they send a string. */
  etd: string | null;
  estimatedDays: number | null;
  codAvailable: boolean;
}

/**
 * Cached in memory, per process.
 *
 * Serviceability between two pincodes changes on the order of days, and the
 * same handful of pincodes get checked over and over — a product page check
 * followed by a bag check followed by a reload. Six hours of caching turns
 * that into one call.
 *
 * Deliberately not in Postgres. This is derived, disposable data whose worst
 * failure is one extra API call, and putting it in a table would mean a model,
 * a migration and an eviction story for something a Map handles. The cost is
 * that each serverless instance warms its own; that is acceptable for a cache
 * whose purpose is avoiding a repeat call within a single browsing session.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const quoteCache = new Map<string, { at: number; value: ServiceabilityQuote }>();

/**
 * Is this pincode deliverable, and roughly when?
 *
 * Returns `serviceable: false` only when Shiprocket says no couriers serve the
 * route. When the call itself fails, this returns an error and the caller says
 * "we couldn't check" — the two must not be confused. Telling someone their
 * address is undeliverable because an API timed out loses a sale for no reason.
 */
export async function checkServiceability(input: {
  deliveryPincode: string;
  cod: boolean;
  /** Kilograms. A default applies when the caller has no real weight. */
  weightKg?: number;
  /** Rupees, for insurance banding on their side. */
  declaredValue?: number;
}): Promise<ShipResult<ServiceabilityQuote>> {
  if (!isShiprocketConfigured()) return { ok: false, error: "not-configured" };

  const pickup = pickupPincode();
  if (!pickup) return { ok: false, error: "no-pickup-pincode" };

  const weight = input.weightKg ?? defaultWeightKg();
  const key = `${pickup}:${input.deliveryPincode}:${input.cod ? 1 : 0}:${weight}`;

  const cached = quoteCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ok: true, value: cached.value };
  }

  const params = new URLSearchParams({
    pickup_postcode: pickup,
    delivery_postcode: input.deliveryPincode,
    cod: input.cod ? "1" : "0",
    weight: String(weight),
  });
  if (input.declaredValue) params.set("declared_value", String(Math.round(input.declaredValue)));

  const result = await call<{
    data?: { available_courier_companies?: unknown[] };
  }>(`/courier/serviceability/?${params.toString()}`, { method: "GET" });

  if (!result.ok) return result;

  const couriers = Array.isArray(result.value?.data?.available_courier_companies)
    ? (result.value.data!.available_courier_companies as Array<Record<string, unknown>>)
    : [];

  /**
   * Their list is every courier that serves the route, in no useful order.
   * The cheapest one is shown, because that is the one we would actually book
   * and quoting a number we would not honour is worse than quoting none.
   */
  const best = couriers.reduce<Record<string, unknown> | null>((cheapest, courier) => {
    const rate = Number(courier.rate);
    if (!Number.isFinite(rate)) return cheapest;
    if (!cheapest) return courier;
    return rate < Number(cheapest.rate) ? courier : cheapest;
  }, null);

  const quote: ServiceabilityQuote = best
    ? {
        serviceable: true,
        courierName: typeof best.courier_name === "string" ? best.courier_name : null,
        rate: Number.isFinite(Number(best.rate)) ? Number(best.rate) : null,
        etd: typeof best.etd === "string" && best.etd ? best.etd : null,
        estimatedDays: Number.isFinite(Number(best.estimated_delivery_days))
          ? Number(best.estimated_delivery_days)
          : null,
        codAvailable: Number(best.cod) === 1,
      }
    : {
        serviceable: false,
        courierName: null,
        rate: null,
        etd: null,
        estimatedDays: null,
        codAvailable: false,
      };

  // Cheap eviction: this is a cache, and the oldest insertion is the least
  // likely to be wanted. A real LRU would need bookkeeping this does not earn.
  if (quoteCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = quoteCache.keys().next().value;
    if (oldest) quoteCache.delete(oldest);
  }
  quoteCache.set(key, { at: Date.now(), value: quote });

  return { ok: true, value: quote };
}

// ---------------------------------------------------------------------------
// Pushing an order
// ---------------------------------------------------------------------------

/**
 * Parcel dimensions and weight.
 *
 * Shiprocket requires all four and rejects zeroes, and this catalogue does not
 * record them — clothing, with no per-item weight anywhere in the content
 * model. So they come from configuration: one conservative parcel size for the
 * whole catalogue, overridable per deployment. Sending a made-up-per-order
 * number would be worse, because their rate is charged on volumetric weight
 * and a wrong guess becomes a wrong invoice.
 */
function parcel() {
  const num = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };
  return {
    length: num(process.env.SHIPROCKET_PARCEL_LENGTH_CM, 30),
    breadth: num(process.env.SHIPROCKET_PARCEL_BREADTH_CM, 25),
    height: num(process.env.SHIPROCKET_PARCEL_HEIGHT_CM, 8),
    weight: num(process.env.SHIPROCKET_PARCEL_WEIGHT_KG, 0.5),
  };
}

function defaultWeightKg(): number {
  return parcel().weight;
}

export interface ShiprocketOrderInput {
  orderNumber: string;
  placedAt: Date;
  email: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  /** "COD" or "Prepaid" — their vocabulary, mapped by the caller. */
  paymentMethod: "COD" | "Prepaid";
  /** Rupees. Their API is in rupees; ours is in paise. Converted at the edge. */
  subTotal: number;
  items: Array<{ name: string; sku: string; units: number; sellingPrice: number }>;
}

export interface ShiprocketOrderResult {
  shiprocketOrderId: string;
  shipmentId: string;
  awb: string | null;
  courierName: string | null;
}

/**
 * The `orders/create/adhoc` payload.
 *
 * "Adhoc" is their word for an order whose products are not in their master
 * catalogue, which is what we want — the catalogue lives here, and mirroring
 * it into Shiprocket would create a second place products can be wrong.
 *
 * `sub_total` is in **rupees**, and their docs warn that they do not compute
 * it. Everything internal is paise, so the conversion happens here, at the
 * boundary, once — see `pushOrder`.
 */
function buildOrderPayload(input: ShiprocketOrderInput) {
  const box = parcel();
  return {
    order_id: input.orderNumber,
    // Their format: yyyy-mm-dd, time optional.
    order_date: input.placedAt.toISOString().slice(0, 10),
    // Must already exist in the Shiprocket account; they reject unknown names.
    pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION,

    billing_customer_name: input.name,
    billing_address: input.line1,
    billing_address_2: input.line2 ?? "",
    billing_city: input.city,
    billing_pincode: input.pincode,
    billing_state: input.state,
    billing_country: "India",
    billing_email: input.email,
    billing_phone: input.phone,
    // We collect one address, so billing is shipping. Setting this false would
    // make every shipping_* field required for no gain.
    shipping_is_billing: true,

    order_items: input.items.map((item) => ({
      name: item.name,
      sku: item.sku,
      units: item.units,
      selling_price: item.sellingPrice,
    })),

    payment_method: input.paymentMethod,
    sub_total: input.subTotal,

    length: box.length,
    breadth: box.breadth,
    height: box.height,
    weight: box.weight,
  };
}

/**
 * Creates the order in Shiprocket and asks for an AWB.
 *
 * Two calls, because they are two steps on their side: creating an order gets
 * a `shipment_id` with `awb_code: null`, and assigning a courier is separate.
 * The AWB is what a customer can actually track, so it is worth the second
 * call — but its failure is not fatal. An order that exists in Shiprocket
 * without an AWB is a real, recoverable state: staff can assign a courier from
 * their dashboard, and the admin's re-push will try again.
 */
export async function pushOrder(
  input: ShiprocketOrderInput,
): Promise<ShipResult<ShiprocketOrderResult>> {
  if (!isShiprocketConfigured()) return { ok: false, error: "not-configured" };

  const created = await call<{
    order_id?: unknown;
    shipment_id?: unknown;
    awb_code?: unknown;
    courier_name?: unknown;
  }>("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(buildOrderPayload(input)),
  });

  if (!created.ok) return created;

  const shiprocketOrderId = stringify(created.value.order_id);
  const shipmentId = stringify(created.value.shipment_id);
  if (!shiprocketOrderId || !shipmentId) {
    return { ok: false, error: "create-order-returned-no-ids" };
  }

  let awb = stringify(created.value.awb_code);
  let courierName = stringify(created.value.courier_name);

  if (!awb) {
    const assigned = await assignAwb(shipmentId);
    if (assigned.ok) {
      awb = assigned.value.awb;
      courierName = assigned.value.courierName;
    } else {
      // Logged, not returned as a failure: the order IS in Shiprocket, and
      // reporting failure here would have the outbox retry `create/adhoc`,
      // which they reject as a duplicate order_id — turning a missing AWB into
      // a permanently failing job.
      console.error(`[shiprocket] AWB assignment failed for ${input.orderNumber}: ${assigned.error}`);
    }
  }

  return { ok: true, value: { shiprocketOrderId, shipmentId, awb, courierName } };
}

export async function assignAwb(
  shipmentId: string,
): Promise<ShipResult<{ awb: string | null; courierName: string | null }>> {
  const result = await call<{
    response?: { data?: { awb_code?: unknown; courier_name?: unknown } };
  }>("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  if (!result.ok) return result;

  const data = result.value?.response?.data ?? {};
  return {
    ok: true,
    value: { awb: stringify(data.awb_code), courierName: stringify(data.courier_name) },
  };
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export interface TrackingSnapshot {
  /** Their words, e.g. "PICKED UP", "IN TRANSIT", "Delivered". */
  currentStatus: string | null;
  courierName: string | null;
  /** Estimated delivery, as they send it. */
  etd: string | null;
}

/** `GET /courier/track/awb/{awb}`. */
export async function trackByAwb(awb: string): Promise<ShipResult<TrackingSnapshot>> {
  const result = await call<{
    tracking_data?: { shipment_track?: unknown[] };
  }>(`/courier/track/awb/${encodeURIComponent(awb)}`, { method: "GET" });

  if (!result.ok) return result;

  const track = result.value?.tracking_data?.shipment_track;
  const first = Array.isArray(track) && track.length > 0 ? (track[0] as Record<string, unknown>) : null;

  if (!first) return { ok: false, error: "no-tracking-data" };

  return {
    ok: true,
    value: {
      currentStatus: stringify(first.current_status),
      courierName: stringify(first.courier_name),
      etd: stringify(first.edd) ?? stringify(first.etd),
    },
  };
}

/**
 * The page a customer can open to follow their parcel.
 *
 * **Not from the API documentation** — Shiprocket's API returns tracking data,
 * not a customer-facing URL, and their branded tracking page lives on whatever
 * domain the seller has configured. So it is a template in configuration, with
 * their default public tracking page as the fallback. Set
 * SHIPROCKET_TRACKING_URL to your own branded page if you have one; the `{awb}`
 * placeholder is substituted.
 */
export function trackingUrlFor(awb: string): string {
  const template = process.env.SHIPROCKET_TRACKING_URL?.trim() || "https://shiprocket.co/tracking/{awb}";
  return template.replace("{awb}", encodeURIComponent(awb));
}

function stringify(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
