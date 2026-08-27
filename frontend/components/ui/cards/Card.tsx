import type { ReactNode } from "react";
import { cn } from "@utils/libs/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the pointer-only hover lift. Use for cards in a clickable grid. */
  interactive?: boolean;
  padded?: boolean;
}

/**
 * A card fills its grid cell: `h-full` plus a flex column.
 *
 * Grid already stretches every item to the tallest in the row, but without this
 * the card's own content stops early and its action bar floats mid-cell — so a
 * two-line product name made one card's footer sit lower than its neighbours'.
 * Pair with `flex-1` on the body so the footer is pushed to the bottom edge.
 */
export function Card({
  children,
  className,
  interactive = false,
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border-border rounded-card flex h-full flex-col border shadow-card",
        padded && "p-[18px]",
        interactive && "hover-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}
