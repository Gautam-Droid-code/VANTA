import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { hasDatabase } from "@/lib/db";
import { getCustomer } from "@/lib/auth/customerSession";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { SignInForm } from "@/components/account/SignInForm";
import { AccountsUnavailable } from "@/components/account/AccountsUnavailable";

export const metadata: Metadata = {
  title: "Sign in — VANTA",
  robots: { index: false, follow: true },
};

/**
 * Sign in.
 *
 * `next` is carried through so that arriving here from a protected page sends
 * you back to it afterwards, rather than to a generic account screen you did
 * not ask for.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already signed in — showing the form again would be a dead end.
  if (await getCustomer()) redirect("/account");

  const [{ homepage }, params] = await Promise.all([contentStore.read(), searchParams]);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="mx-auto w-full max-w-[420px] px-gutter pb-24 lg:pb-32">
          <h1 className="headline text-display-sm">Sign in</h1>
          <p className="mb-8 mt-3 text-sm text-bone/50">
            Your bag and saved items follow you to every device.
          </p>
          {hasDatabase() ? <SignInForm next={params.next} /> : <AccountsUnavailable />}
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
