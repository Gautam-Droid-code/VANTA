"use client";

import Image from "next/image";
import type { LookSlide } from "@/data/types";
import { backdropClass } from "@/lib/backdrops";
import { useDraft } from "@/components/admin/AdminDraftProvider";
import { SectionPage } from "@/components/admin/SectionPage";
import { BackdropPicker } from "@/components/admin/BackdropPicker";
import { ImagePicker } from "@/components/admin/ImagePicker";
import { AddButton, ReorderRow, moveItem } from "@/components/admin/ReorderableList";
import { Card, CardHeader, Field, TextInput } from "@/components/admin/ui";
import { slugify } from "@/components/admin/ProductDrawer";

/**
 * `LookSlide` is `{ id, image, backdrop, caption, href }` — the brief listed
 * only image/backdrop/caption, so `id` (auto) and `href` are included too.
 */
export default function LookbookEditorPage() {
  const { content, updateSection } = useDraft();
  const slides = content.lookbook.slides;

  const setSlides = (next: LookSlide[]) => updateSection("lookbook", { slides: next });
  const patch = (i: number, p: Partial<LookSlide>) =>
    setSlides(slides.map((s, j) => (j === i ? { ...s, ...p } : s)));

  return (
    <SectionPage
      title="Lookbook"
      description="The swipeable row of model shots below the hero. Drag order sets the order on the site."
    >
      <Card>
        <CardHeader
          title={`Slides (${slides.length})`}
          hint="Shown as a swipeable carousel on phones and a 3-column grid on desktop."
        />
        <div className="p-5">
          <ul className="space-y-3">
            {slides.map((slide, i) => (
              <ReorderRow
                key={slide.id}
                index={i}
                total={slides.length}
                title={slide.caption || "Untitled slide"}
                subtitle={`Slide ${i + 1}`}
                onMove={(from, to) => setSlides(moveItem(slides, from, to))}
                onRemove={(idx) => setSlides(slides.filter((_, j) => j !== idx))}
                canRemove={slides.length > 1}
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`relative h-24 w-20 shrink-0 overflow-hidden rounded ${backdropClass[slide.backdrop]}`}
                    >
                      <Image
                        src={slide.image.src}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover object-top"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <Field label="Caption" htmlFor={`slide-caption-${i}`}>
                        <TextInput
                          id={`slide-caption-${i}`}
                          value={slide.caption}
                          onChange={(e) =>
                            patch(i, {
                              caption: e.target.value,
                              id: slide.id || slugify(e.target.value),
                            })
                          }
                        />
                      </Field>

                      <Field
                        label="Link"
                        htmlFor={`slide-href-${i}`}
                        note="Coming soon"
                        hint="Collection pages are coming soon, so this won't open anything yet."
                      >
                        <TextInput
                          id={`slide-href-${i}`}
                          value={slide.href}
                          onChange={(e) => patch(i, { href: e.target.value })}
                        />
                      </Field>
                    </div>
                  </div>

                  <Field label="Photo">
                    <ImagePicker
                      value={slide.image}
                      onChange={(image) => patch(i, { image })}
                      idPrefix={`slide-${i}`}
                    />
                  </Field>

                  <Field label="Backdrop">
                    <BackdropPicker
                      value={slide.backdrop}
                      onChange={(backdrop) => patch(i, { backdrop })}
                      idPrefix={`slide-${i}-backdrop`}
                    />
                  </Field>
                </div>
              </ReorderRow>
            ))}
          </ul>

          <AddButton
            onClick={() =>
              setSlides([
                ...slides,
                {
                  id: `look-${Date.now()}`,
                  caption: "New slide",
                  href: "/collections/new",
                  backdrop: "red",
                  image: {
                    src: "/images/model-01.webp",
                    alt: "",
                    width: 848,
                    height: 1264,
                  },
                },
              ])
            }
          >
            + Add slide
          </AddButton>
        </div>
      </Card>
    </SectionPage>
  );
}
