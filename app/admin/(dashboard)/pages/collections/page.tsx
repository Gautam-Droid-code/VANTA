"use client";

import Link from "next/link";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { Card, CardHeader, Field, TextArea, TextInput, Toggle } from "@/components/admin/ui";

/**
 * Settings shared by every collection page.
 *
 * Only the template lives here. A single collection's own intro and banner
 * belong to that category, and are edited on the Categories page — putting
 * them here would mean one description shown on all eight pages.
 */
export default function CollectionPagesEditor() {
  const { collectionPage, updateCollectionPage } = useDraft();
  const patch = (p: Partial<typeof collectionPage>) =>
    updateCollectionPage({ ...collectionPage, ...p });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-admin-muted">
          <Link href="/admin/pages" className="hover:text-admin-ink">
            Pages
          </Link>
          <span aria-hidden className="px-1.5">/</span>
          <span className="text-admin-ink">Collection pages</span>
        </nav>
        <h1 className="font-admin-display text-2xl font-bold tracking-tight text-admin-ink">
          Collection pages
        </h1>
        <p className="mt-1 text-sm text-admin-muted">
          Settings shared by every collection page. To write an intro for one
          collection, edit it on{" "}
          <Link href="/admin/categories" className="underline underline-offset-2 hover:text-admin-ink">
            Categories
          </Link>
          .
        </p>
      </header>

      <Card>
        <CardHeader
          title="Collections index"
          hint="The page listing every collection, at /collections."
        />
        <div className="space-y-4 p-5">
          <Field label="Heading" htmlFor="cp-heading">
            <TextInput
              id="cp-heading"
              value={collectionPage.indexHeading}
              onChange={(e) => patch({ indexHeading: e.target.value })}
            />
          </Field>
          <Field
            label="Intro"
            htmlFor="cp-intro"
            hint={`${collectionPage.indexIntro.length} characters`}
          >
            <TextArea
              id="cp-intro"
              rows={3}
              value={collectionPage.indexIntro}
              onChange={(e) => patch({ indexIntro: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Automatic collections"
          hint="These three build themselves from your products — nothing is assigned to them by hand."
        />
        <div className="space-y-4 p-5">
          <Field
            label="Products marked NEW"
            htmlFor="cp-new"
            hint="Shown at /collections/new. Any product carrying the NEW badge appears here."
          >
            <TextInput
              id="cp-new"
              value={collectionPage.viewNames.new}
              onChange={(e) =>
                patch({ viewNames: { ...collectionPage.viewNames, new: e.target.value } })
              }
            />
          </Field>
          <Field
            label="Products with a reduced price"
            htmlFor="cp-sale"
            hint="Shown at /collections/sale. Any product whose compare-at price is higher than its price."
          >
            <TextInput
              id="cp-sale"
              value={collectionPage.viewNames.sale}
              onChange={(e) =>
                patch({ viewNames: { ...collectionPage.viewNames, sale: e.target.value } })
              }
            />
          </Field>
          <Field
            label="Every product"
            htmlFor="cp-all"
            hint="Shown at /collections/all."
          >
            <TextInput
              id="cp-all"
              value={collectionPage.viewNames.all}
              onChange={(e) =>
                patch({ viewNames: { ...collectionPage.viewNames, all: e.target.value } })
              }
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="When a collection is empty" hint="Shown instead of the product grid." />
        <div className="space-y-4 p-5">
          <Field label="Message" htmlFor="cp-empty">
            <TextInput
              id="cp-empty"
              value={collectionPage.emptyMessage}
              onChange={(e) => patch({ emptyMessage: e.target.value })}
            />
          </Field>
          <Field
            label="Link text"
            htmlFor="cp-empty-cta"
            hint="Takes the visitor to every product, so an empty page is never a dead end."
          >
            <TextInput
              id="cp-empty-cta"
              value={collectionPage.emptyCtaLabel}
              onChange={(e) => patch({ emptyCtaLabel: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Display" />
        <div className="p-5">
          <Toggle
            checked={collectionPage.showCount}
            onChange={(showCount) => patch({ showCount })}
            label="Show the number of pieces"
            hint="Appears next to the heading, e.g. “12 pieces”."
          />
        </div>
      </Card>
    </div>
  );
}
