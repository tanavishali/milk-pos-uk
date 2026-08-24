import type { ReactNode } from "react";
import { cn } from "@utils/libs/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Adds the pointer-only hover lift. Use for cards in a clickable grid. */
  interactive?: boolean;
  padded?: boolean;
}

export function Card({
  children,
  className,
  interactive = false,
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface border-border rounded-card border shadow-card",
        padded && "p-[18px]",
        interactive && "hover-lift",
        className,
      )}
    >
      {children}
    </div>
  );
}
