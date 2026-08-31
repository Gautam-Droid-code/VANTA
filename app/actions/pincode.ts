"use server";

import { headers } from "next/headers";
import { checkServiceability, isShiprocketConfigured } from "@/lib/shipping/shiprocket";

/**
 * "Do you deliver to my pincode, and when?"
 *
 * Asked from the product page and the bag, before checkout, because the two
 * questions people actually want answered before adding something to a bag are
 * "will it reach me" and "by when". Finding out at the last step of checkout is
 * the worst possible time.
 *
 * This is a Server Action, which means it is a public POST endpoint that
 * spends money on somebody else's API. Three things follow from that, and all
 * three are enforced below: the input is validated before it is used, the
 * result is cached (in `lib/shipping/shiprocket.ts`), and the endpoint is
 * throttled per address.
 */

export interface PincodeAnswer {
  status: "serviceable" | "not-serviceable" | "unknown" | "invalid" | "throttled";
  /** Human-readable estimate, e.g. "Arrives by Jul 01, 2024" or "3–4 days". */
  eta?: string;
  courier?: string;
  codAvailable?: boolean;
  message?: string;
}

/** Indian pincodes: six digits, and the first is never 0. */
const PINCODE = /^[1-9][0-9]{5}$/;

/**
 * A per-address throttle, in memory.
 *
 * Deliberately not the Postgres limiter in `lib/rateLimit.ts`: that one counts
 * *failed* attempts and locks accounts out, which is right for a login and
 * wrong here, where every call succeeds and the thing being protected is an
 * API quota rather than a credential.
 *
 * Per-process, so it is a speed bump rather than a wall — a distributed flood
 * would get one bucket per instance. That is an acceptable ceiling because the
 * expensive call behind it is already cached for six hours per pincode, so the
 * worst a determined caller achieves is cache hits.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; windowStart: number }>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const bucket = hits.get(ip);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    // Bounded so a long-running instance cannot accumulate a bucket per address
    // seen. Cleared wholesale rather than swept — it is a throttle, and the
    // worst case of a reset is one extra allowed minute.
    if (hits.size > 5000) hits.clear();
    return false;
  }

  bucket.count++;
  return bucket.count > MAX_PER_WINDOW;
}

export async function checkPincode(
  pincode: string,
  options?: { cod?: boolean; valueRupees?: number },
): Promise<PincodeAnswer> {
  const cleaned = String(pincode ?? "").trim();

  if (!PINCODE.test(cleaned)) {
    return { status: "invalid", message: "Enter a 6-digit pincode." };
  }

  if (!isShiprocketConfigured()) {
    // Honest rather than encouraging. Claiming serviceability we cannot verify
    // would put the discovery of a problem after the sale.
    return { status: "unknown", message: "Delivery checks aren’t available right now." };
  }

  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headerList.get("x-real-ip") ??
    "unknown";

  if (throttled(ip)) {
    return { status: "throttled", message: "Too many checks. Try again in a minute." };
  }

  const result = await checkServiceability({
    deliveryPincode: cleaned,
    cod: options?.cod ?? true,
    declaredValue: options?.valueRupees,
  });

  /**
   * A failed call is "unknown", never "not serviceable".
   *
   * These are different answers and conflating them is expensive: telling
   * somebody their address is undeliverable because an API timed out ends the
   * visit. The bag and the product page both treat "unknown" as no obstacle to
   * carrying on.
   */
  if (!result.ok) {
    return { status: "unknown", message: "Couldn’t check right now — you can still order." };
  }

  if (!result.value.serviceable) {
    return {
      status: "not-serviceable",
      message: "No courier delivers to this pincode yet.",
    };
  }

  return {
    status: "serviceable",
    eta: describeEta(result.value.etd, result.value.estimatedDays),
    courier: result.value.courierName ?? undefined,
    codAvailable: result.value.codAvailable,
  };
}

/**
 * Shiprocket returns both a formatted date (`etd`, "Jul 01, 2024") and a day
 * count. The date is preferred because "by 1 July" is a promise a person can
 * plan around, where "in 4 days" needs arithmetic.
 */
function describeEta(etd: string | null, days: number | null): string | undefined {
  if (etd) {
    const parsed = new Date(etd);
    if (!Number.isNaN(parsed.getTime())) {
      return `Arrives by ${parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })}`;
    }
    return `Arrives by ${etd}`;
  }
  if (days && days > 0) return `Arrives in about ${days} ${days === 1 ? "day" : "days"}`;
  return undefined;
}
