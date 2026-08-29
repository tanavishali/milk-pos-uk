import type { ReactNode } from "react";
import { cn } from "@utils/libs/cn";

type Tone =
  "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "mono";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-foreground-body",
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-muted text-success-text",
  warning: "bg-warning-muted text-warning-text",
  danger: "bg-danger-muted text-danger-text",
  // The middle state — a part-paid bill is neither settled nor untouched.
  info: "bg-info-muted text-info-text",
  mono: "bg-surface-subtle text-foreground-body font-mono",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  pill?: boolean;
  uppercase?: boolean;
  className?: string;
}

export function Badge({
  children,
  tone = "neutral",
  pill = false,
  uppercase = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "text-nano inline-block px-2 py-0.5 font-bold whitespace-nowrap",
        pill ? "rounded-full" : "rounded-control-sm",
        uppercase && "uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
