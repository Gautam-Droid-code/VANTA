import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { hasDatabase } from "@/lib/db";
import { getCustomer } from "@/lib/auth/customerSession";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { RegisterForm } from "@/components/account/RegisterForm";
import { AccountsUnavailable } from "@/components/account/AccountsUnavailable";

export const metadata: Metadata = {
  title: "Create an account — VANTA",
  robots: { index: false, follow: true },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await getCustomer()) redirect("/account");

  const [{ homepage }, params] = await Promise.all([contentStore.read(), searchParams]);

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <div className="mx-auto w-full max-w-[420px] px-gutter pb-24 lg:pb-32">
          <h1 className="headline text-display-sm">Create account</h1>
          <p className="mb-8 mt-3 text-sm text-bone/50">
            Keep your bag, your saved items and your delivery address in one place.
          </p>
          {hasDatabase() ? <RegisterForm next={params.next} /> : <AccountsUnavailable />}
        </div>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
