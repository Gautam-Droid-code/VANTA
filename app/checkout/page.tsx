import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { contentStore } from "@/lib/contentStore";
import { hasDatabase, prisma } from "@/lib/db";
import { getCustomer } from "@/lib/auth/customerSession";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { CheckoutDemoNotice } from "@/components/DemoNotice";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";

export const metadata: Metadata = pageMetadata({
  title: "Checkout",
  description:
    "Confirm your delivery address and pay by card, UPI, netbanking or cash on delivery. Prices are calculated fresh from the live catalogue.",
  path: "/checkout",
  noindex: true,
});

/**
 * Checkout.
 *
 * A server component that gathers everything the server can know — the
 * catalogue, the signed-in customer, their saved addresses — and hands it to
 * two client leaves for the parts that depend on `localStorage`.
 *
 * Guests are not redirected to sign in. Requiring an account at checkout is the
 * single most reliable way to lose a first-time sale, and the order model
 * treats `customerId` as optional precisely so this page does not have to.
 */
/**
 * Per-customer, so never prerendered. Stated rather than inferred: this page
 * built as static because `getCustomer()` returns before touching `cookies()`
 * when no database is configured, so nothing marked it dynamic. DECISIONS §26.
 */
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const customer = await getCustomer();

  const [{ homepage, products }, addresses] = await Promise.all([
    contentStore.read(),
    customer && hasDatabase()
      ? prisma.address.findMany({
          where: { customerId: customer.id },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            fullName: true,
            phone: true,
            line1: true,
            line2: true,
            city: true,
            state: true,
            pincode: true,
            isDefault: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="px-gutter pb-24 lg:px-gutter-lg">
          <h1 className="headline text-display-sm lg:text-display-md">Checkout</h1>

          {/*
            The one page where somebody could type a real address and a real
            phone number into a form. The warning belongs before the fields,
            not beside them. §37.
          */}
          <CheckoutDemoNotice className="mt-6" />

          {!hasDatabase() ? (
            /*
             * Orders need somewhere to live. Saying so is better than a form
             * that collects an address and then fails on submit.
             */
            <div className="mt-8 max-w-prose rounded-lg border border-ink-line bg-ink-soft px-4 py-5">
              <p className="text-sm text-bone">Checkout isn’t available yet.</p>
              <p className="mt-2 text-sm leading-relaxed text-bone/60">
                Your bag is safe — this browser is keeping it. Orders need a
                database, which this site doesn’t have configured.
              </p>
              <Link
                href="/bag"
                className="mt-4 inline-block text-label font-bold uppercase text-bone underline underline-offset-4"
              >
                Back to bag
              </Link>
            </div>
          ) : (
            <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
              <CheckoutForm
                addresses={addresses}
                signedInEmail={customer?.email ?? null}
                onlinePaymentEnabled={isRazorpayConfigured()}
              />

              <aside className="mt-12 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:mt-0">
                <h2 className="text-label font-bold uppercase tracking-[0.12em] text-bone/50">
                  Your order
                </h2>
                <div className="mt-4">
                  <CheckoutSummary catalogue={products} />
                </div>

                {!customer && (
                  <p className="mt-6 text-xs leading-relaxed text-bone/40">
                    Checking out as a guest.{" "}
                    <Link
                      href="/account/login?next=/checkout"
                      className="text-bone underline underline-offset-4"
                    >
                      Sign in
                    </Link>{" "}
                    to use a saved address and keep your order history.
                  </p>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
