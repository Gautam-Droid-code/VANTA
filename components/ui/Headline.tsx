import type { HeadlineLine } from "@/data/types";
import { cn } from "@/lib/format";

interface HeadlineProps {
  lines: HeadlineLine[];
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Wraps each line so a parent can mask/animate it. */
  renderLine?: (content: React.ReactNode, index: number) => React.ReactNode;
}

/**
 * Renders a data-driven headline, mixing the heavy grotesk with italic serif
 * accent segments. Which words are italic is content, not markup.
 */
export function Headline({ lines, className, as: Tag = "h2", renderLine }: HeadlineProps) {
  return (
    <Tag className={cn("headline", className)}>
      {lines.map((line, i) => {
        const content = line.map((seg, j) =>
          seg.accent ? (
            <em key={j}>{seg.text}</em>
          ) : (
            <span key={j}>{seg.text}</span>
          ),
        );
        return (
          <span key={i} className="block">
            {renderLine ? renderLine(content, i) : content}
          </span>
        );
      })}
    </Tag>
  );
}
