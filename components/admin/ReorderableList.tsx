"use client";

import { Button } from "./ui";
import { cn } from "@/lib/format";

/**
 * Reorder controls for repeatable lists.
 *
 * Up/down buttons rather than drag-and-drop: no extra dependency, works with a
 * keyboard and screen reader out of the box, and these lists are short (3–7
 * items). Revisit if a list ever grows past ~15 rows.
 */
export function ReorderRow({
  index,
  total,
  onMove,
  onRemove,
  canRemove = true,
  title,
  subtitle,
  children,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
  canRemove?: boolean;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-admin-border bg-admin-surface">
      <div className="flex items-start gap-3 p-3">
        <div className="flex shrink-0 flex-col gap-1">
          <IconBtn
            label={`Move ${title} up`}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            ↑
          </IconBtn>
          <IconBtn
            label={`Move ${title} down`}
            disabled={index === total - 1}
            onClick={() => onMove(index, index + 1)}
          >
            ↓
          </IconBtn>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-admin-ink">{title}</p>
              {subtitle && (
                <p className="truncate text-xs text-admin-muted">{subtitle}</p>
              )}
            </div>
            {onRemove && canRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="shrink-0 text-xs font-medium text-admin-muted transition-colors hover:text-admin-danger"
              >
                Remove
              </button>
            )}
          </div>
          {children && <div className="mt-3">{children}</div>}
        </div>
      </div>
    </li>
  );
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded border text-xs transition-colors",
        disabled
          ? "cursor-not-allowed border-admin-border text-admin-border-strong"
          : "border-admin-border text-admin-muted hover:border-admin-border-strong hover:text-admin-ink",
      )}
    >
      {children}
    </button>
  );
}

/** Immutable array move helper shared by every list editor. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" onClick={onClick} className="mt-3">
      {children}
    </Button>
  );
}
