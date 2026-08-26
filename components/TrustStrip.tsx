import type { TrustItem } from "@/data/types";
import { fadeUpSm } from "@/lib/motion";
import { trustIcons } from "@/components/ui/Icons";
import { RevealGroup, RevealItem } from "@/components/ui/Reveal";

interface TrustStripProps {
  items: TrustItem[];
}

/**
 * Server component. Four reassurance points, 2-up on mobile and 4-up from `sm`,
 * on the raised surface tone so it reads as a band rather than a section.
 */
export function TrustStrip({ items }: TrustStripProps) {
  return (
    <section className="border-y border-bone/10 bg-ink-soft" aria-label="Shopping benefits">
      <RevealGroup
        as="ul"
        className="mx-auto grid max-w-container grid-cols-2 gap-x-6 gap-y-10 px-gutter py-14 sm:grid-cols-4 lg:px-gutter-lg lg:py-16"
      >
        {items.map((item) => {
          const Icon = trustIcons[item.icon];
          return (
            <RevealItem
              key={item.id}
              as="li"
              variants={fadeUpSm}
              className="flex flex-col items-center text-center"
            >
              <Icon className="h-7 w-7 text-bone/80" />
              <h3 className="mt-4 text-label font-bold uppercase tracking-[0.15em] text-bone">
                {item.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-bone/50">{item.detail}</p>
            </RevealItem>
          );
        })}
      </RevealGroup>
    </section>
  );
}
