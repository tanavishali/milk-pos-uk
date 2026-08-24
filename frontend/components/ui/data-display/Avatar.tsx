import { initials } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";

/**
 * Five tinted pairs, assigned deterministically from the record id — so a
 * customer keeps the same colour across renders, pages and view modes. Random
 * or index-based assignment would reshuffle on every filter.
 */
const PALETTE = [
  "bg-accent-soft text-accent-text",
  "bg-info-soft text-info-text",
  "bg-[#f3eefe] text-[#7c3aed] dark:bg-[#7c3aed1f] dark:text-[#a78bfa]",
  "bg-warning-soft text-warning-text",
  "bg-danger-soft text-danger-text",
] as const;

/** Stable hash so the colour depends on the id, not on list position. */
function paletteFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003;
  }
  return PALETTE[hash % PALETTE.length]!;
}

interface AvatarProps {
  name: string;
  /** Drives the colour. Pass the record id so it never changes. */
  seed?: string;
  size?: "sm" | "md" | "lg";
  /** Solid accent instead of a tint — for the detail dialog's identity band. */
  solid?: boolean;
  className?: string;
}

const sizes = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

export function Avatar({
  name,
  seed,
  size = "md",
  solid = false,
  className,
}: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        sizes[size],
        solid
          ? "bg-accent text-foreground-on-accent"
          : paletteFor(seed ?? name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
