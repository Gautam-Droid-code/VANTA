import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentStore } from "@/lib/contentStore";
import { policies, policyBySlug } from "@/data/policies";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";

/**
 * Returns, Shipping, Terms and Privacy.
 *
 * One route for all four rather than four near-identical files: they differ
 * only in their content, which lives in `data/policies.ts`.
 *
 * Deliberately plain. These are pages someone reads when something has gone
 * wrong or before they trust you with a card number, and neither moment is
 * improved by scroll animation.
 */
export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = policyBySlug[slug];
  if (!policy) return { title: "Not found" };
  return { title: `${policy.title} — VANTA`, description: policy.intro };
}

export default async function PolicyRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = policyBySlug[slug];
  if (!policy) notFound();

  const { homepage } = await contentStore.read();

  return (
    <div className="storefront-shell">
      <Navbar nav={homepage.nav} />

      <main id="main" className="pt-[calc(var(--header-h)+2rem)]">
        <article className="mx-auto max-w-2xl px-gutter pb-20 lg:px-gutter-lg lg:pb-28">
          <header className="border-b border-ink-line pb-8">
            <h1 className="headline text-display-sm lg:text-display-md">{policy.title}</h1>
            <p className="eyebrow mt-4">{policy.updated}</p>
            <p className="mt-5 max-w-prose text-base leading-relaxed text-bone/70">
              {policy.intro}
            </p>
          </header>

          {/*
            Says plainly that this is placeholder text.

            These pages read as authoritative by their nature — a heading, a
            date, numbered clauses — and that is exactly why unreviewed copy
            here is dangerous: nobody thinks to check it before launch. The
            notice is the page's own admission, and it goes when a lawyer has
            been through the words.
          */}
          <aside
            role="note"
            className="mt-8 border border-flare-red/40 bg-flare-red/5 px-4 py-3"
          >
            <p className="text-label font-bold uppercase text-flare-red">Placeholder text</p>
            <p className="mt-2 text-sm leading-relaxed text-bone/60">
              This page has not been reviewed by a lawyer and is not binding. Some
              details — the registered address, GST number and retention periods —
              are invented. Replace it before taking payments.
            </p>
          </aside>

          <div className="mt-10 space-y-10">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-label-lg font-bold uppercase tracking-[0.12em] text-bone">
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-4">
                  {section.body.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 40)}
                      className="max-w-prose whitespace-pre-line text-base leading-relaxed text-bone/70"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* The other three, so someone reading one can reach the rest without
              scrolling back to the footer. */}
          <nav aria-label="Other policies" className="mt-14 border-t border-ink-line pt-6">
            <p className="eyebrow">More</p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {policies
                .filter((p) => p.slug !== policy.slug)
                .map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/${p.slug}`}
                      className="text-sm text-bone/60 underline underline-offset-4 transition-colors hover:text-bone"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </article>
      </main>

      <Footer content={homepage.footer} />
      <BottomNav items={homepage.nav.bottomNav} />
    </div>
  );
}
