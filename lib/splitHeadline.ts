import type { HeadlineLine } from "@/data/types";

/**
 * Splits a data-layer headline into per-character pieces for staggered reveals,
 * while keeping the accent (italic serif) flag attached to each character.
 *
 * Why per-character: line-level reveals read as "a block arrived". Character
 * reveals read as type being *set* — the effect the reference sites get from
 * GSAP's SplitText, done here in our own code so there's no extra dependency
 * and no licensed plugin.
 *
 * Spaces are emitted as their own non-animating units so word shapes survive
 * and `white-space` handling stays predictable.
 */
export interface SplitChar {
  char: string;
  accent: boolean;
  isSpace: boolean;
  /** Index across the whole headline — drives one continuous stagger. */
  index: number;
}

export type SplitLine = SplitChar[];

export function splitHeadline(lines: HeadlineLine[]): SplitLine[] {
  let index = 0;
  return lines.map((line) =>
    line.flatMap((segment) =>
      Array.from(segment.text).map((char) => ({
        char,
        accent: Boolean(segment.accent),
        isSpace: char === " ",
        index: index++,
      })),
    ),
  );
}

/** The plain string, for the accessible label behind the split markup. */
export function headlineText(lines: HeadlineLine[]): string {
  return lines.map((line) => line.map((s) => s.text).join("")).join(" ");
}
