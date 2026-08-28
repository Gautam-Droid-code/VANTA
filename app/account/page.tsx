import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { prisma } from "@/lib/db";
import { getCustomer } from "@/lib/auth/customerSession";
import { readCustomerData } from "@/lib/auth/customerData";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { AddressBook } from "@/components/account/AddressBook";
import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "Your account — VANTA",
  robots: { index: false, follow: true },
};

/**
 * The account page.
 *
 * Signed-out visitors are redirected rather than shown a sign-in form in place.
 * The two are different pages with different metadata and different intent, and
 * a URL that means either one depending on a cookie is a URL nobody can link to.
 */
export default async function AccountPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account");

  const [{ homepage }, addresses, saved] = await Promise.all([
    contentStore.read(),
    prisma.address.findMany({
      where: { customerId: customer.id },
      // Default first, then oldest — the order a checkout would present them in.
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
    }),
    readCustomerData(customer.id),
  ]);

  const bagCount = saved.bag.reduce((total, line) => total + line.qty, 0);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="mx-auto w-full max-w-[720px] px-gutter pb-24 lg:pb-32">
          <p className="eyebrow">Account</p>
          <h1 className="mt-2 headline text-display-sm lg:text-display-md">
            {customer.name ?? "Welcome back"}
          </h1>
          <p className="mt-3 text-sm text-bone/50">{customer.email}</p>

          {/* What the account is currently holding, stated plainly. This is the
              whole visible payoff of signing in, so it should not be buried. */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile label="In your bag" value={String(bagCount)} href="/bag" />
            <SummaryTile
              label="Saved items"
              value={String(saved.wishlist.length)}
              href="/wishlist"
            />
            <SummaryTile label="Addresses" value={String(addresses.length)} />
          </div>

          <hr className="my-10 border-ink-line" />

          <AddressBook addresses={addresses} />

          <hr className="my-10 border-ink-line" />

          <section>
            <h2 className="headline text-2xl">Orders</h2>
            <p className="mt-3 max-w-prose text-sm text-bone/50">
              Nothing here yet — checkout is the next thing being built. Orders
              and delivery tracking will appear on this page.
            </p>
          </section>

          <hr className="my-10 border-ink-line" />

          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full border border-bone/25 px-8 py-4 text-label-lg font-bold uppercase text-bone transition-colors hover:border-bone hover:bg-bone hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-label font-bold uppercase tracking-[0.14em] text-bone/40">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-black">{value}</p>
    </>
  );

  return href ? (
    <Link
      href={href}
      className="rounded-xl border border-ink-line bg-ink-soft p-4 transition-colors hover:border-bone/30"
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-ink-line bg-ink-soft p-4">{body}</div>
  );
}
