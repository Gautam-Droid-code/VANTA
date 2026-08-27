"use client";

import { SectionEditor } from "@/components/admin/SectionEditor";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import type { BrandStatementContent } from "@/data/types";

/**
 * Same component as the Hero editor. The only difference is the data it's
 * handed — this section's type carries an `eyebrow`, so that field appears.
 */
export default function BrandStatementEditorPage() {
  const { content, updateSection } = useDraft();

  return (
    <SectionEditor
      title="Brand Statement"
      description="The secondary editorial block further down the homepage."
      value={content.brandStatement}
      onChange={(next) => updateSection("brandStatement", next as BrandStatementContent)}
    />
  );
}
