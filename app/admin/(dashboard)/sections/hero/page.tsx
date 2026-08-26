"use client";

import { SectionEditor } from "@/components/admin/SectionEditor";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import type { HeroContent } from "@/data/types";

export default function HeroEditorPage() {
  const { content, updateSection } = useDraft();

  return (
    <SectionEditor
      title="Hero"
      description="The first thing visitors see — full-bleed photo, headline and main call to action."
      value={content.hero}
      onChange={(next) => updateSection("hero", next as HeroContent)}
    />
  );
}
