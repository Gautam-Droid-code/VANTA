"use client";

import { useDraft } from "@/components/admin/AdminDraftProvider";
import { SectionPage } from "@/components/admin/SectionPage";
import { LinkListEditor } from "@/components/admin/LinkListEditor";
import { Card, CardHeader, Field, TextInput } from "@/components/admin/ui";

/**
 * `FooterContent` is `{ wordmark, tagline, links, copyright }` — the brief
 * listed only tagline and links, so wordmark and copyright are included too.
 *
 * The WhatsApp support link lives in `footer.links` (not in nav), so the
 * number field belongs here. It edits the `wa.me` link's href in place rather
 * than storing the number separately, because the schema has no phone field.
 */
const WA_PREFIX = "https://wa.me/";

export default function FooterEditorPage() {
  const { content, updateSection } = useDraft();
  const footer = content.footer;

  const waIndex = footer.links.findIndex((l) => l.href.startsWith(WA_PREFIX));
  const waNumber = waIndex >= 0 ? footer.links[waIndex].href.slice(WA_PREFIX.length) : "";

  const setWaNumber = (digits: string) => {
    const clean = digits.replace(/[^0-9]/g, "");
    updateSection("footer", {
      ...footer,
      links: footer.links.map((l, i) =>
        i === waIndex ? { ...l, href: `${WA_PREFIX}${clean}` } : l,
      ),
    });
  };

  return (
    <SectionPage
      title="Footer"
      description="The block at the very bottom of every page."
    >
      <div className="space-y-5">
        <Card>
          <CardHeader title="Wordmark & tagline" />
          <div className="space-y-4 p-5">
            <Field label="Wordmark" htmlFor="footer-wordmark">
              <TextInput
                id="footer-wordmark"
                value={footer.wordmark}
                onChange={(e) => updateSection("footer", { ...footer, wordmark: e.target.value })}
              />
            </Field>
            <Field label="Tagline" htmlFor="footer-tagline" hint="The line under the wordmark.">
              <TextInput
                id="footer-tagline"
                value={footer.tagline}
                onChange={(e) => updateSection("footer", { ...footer, tagline: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        {waIndex >= 0 && (
          <Card>
            <CardHeader
              title="WhatsApp support"
              hint="The number customers reach you on from the footer link."
            />
            <div className="p-5">
              <Field
                label="WhatsApp number"
                htmlFor="wa-number"
                hint="Country code and number, digits only — e.g. 919876543210 for +91 98765 43210. This is currently a placeholder."
              >
                <TextInput
                  id="wa-number"
                  inputMode="numeric"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  placeholder="919876543210"
                />
              </Field>
              <p className="mt-2 text-xs text-admin-subtle">
                Opens as {WA_PREFIX}
                {waNumber || "…"}
              </p>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            title={`Footer links (${footer.links.length})`}
            hint="Shipping, returns, policies and support."
          />
          <div className="p-5">
            <LinkListEditor
              value={footer.links}
              onChange={(links) => updateSection("footer", { ...footer, links })}
              addLabel="+ Add footer link"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Copyright" />
          <div className="p-5">
            <Field label="Copyright line" htmlFor="footer-copyright">
              <TextInput
                id="footer-copyright"
                value={footer.copyright}
                onChange={(e) => updateSection("footer", { ...footer, copyright: e.target.value })}
              />
            </Field>
          </div>
        </Card>
      </div>
    </SectionPage>
  );
}
