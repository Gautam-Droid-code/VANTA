"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/format";

/**
 * A persistent chapter index down the left edge — the spec-sheet spine.
 *
 * Borrowed in spirit from the numbered section rails on technical product
 * sites: it tells you where you are in the story without a scrollbar, and it
 * suits a brand whose whole identity is engineered kit.
 *
 * Desktop only. On phones there's no spare gutter, and the bottom nav already
 * occupies that role.
 *
 * It is a *label*, not navigation — clicking scrolls, but the active state is
 * driven by which section owns the viewport. Kept out of the tab order and
 * hidden from screen readers, since the real headings already provide structure.
 */
export interface Chapter {
  id: string;
  label: string;
}

export function ChapterIndex({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /**
     * Which chapter owns the viewport's midpoint?
     *
     * An earlier version gave each chapter its own start/end trigger, but
     * adjacent ranges overlapped and whichever fired last won — the rail read
     * "04 The Kit" while Series 026 filled the screen. Asking one question
     * against one line has no ambiguity.
     */
    const pick = () => {
      const mid = window.scrollY + window.innerHeight / 2;
      let next = 0;
      chapters.forEach((chapter, i) => {
        const el = document.getElementById(chapter.id);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (mid >= top) next = i;
      });
      setActive(next);
    };

    pick();
    const trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: pick,
      onRefresh: pick,
    });

    return () => trigger.kill();
  }, [chapters]);

  return (
    <nav
      aria-hidden
      className="pointer-events-none fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
    >
      <div className="flex items-center gap-2.5">
        {/* Tick rail — the whole story at a glance, ~10px wide. */}
        <ol className="flex flex-col gap-2.5">
          {chapters.map((chapter, i) => (
            <li
              key={chapter.id}
              className={cn(
                "h-px transition-all duration-500 ease-out",
                i === active ? "w-2.5 bg-bone" : "w-1.5 bg-bone/25",
              )}
            />
          ))}
        </ol>

        {/* Only the active chapter is named, set vertically so the rail stays
            narrow. A horizontal label collided with the section copy — our
            content gutter is 64px, far tighter than the reference sites'. */}
        <span
          key={active}
          className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-bone/45"
          style={{ writingMode: "vertical-rl" }}
        >
          <span className="tabular-nums">{String(active + 1).padStart(2, "0")}</span>
          <span className="mx-1.5">—</span>
          {chapters[active]?.label}
        </span>
      </div>
    </nav>
  );
}
