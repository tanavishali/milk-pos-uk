"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { IconType } from "react-icons";
import { cn } from "@utils/libs/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  // Lifts 1px on hover, matching the redesign's primary action.
  primary:
    "bg-accent text-foreground-on-accent hover:bg-accent-hover hover:-translate-y-px",
  secondary:
    "bg-surface-subtle text-foreground-body border border-border hover:bg-surface-inset",
  ghost: "text-foreground-muted hover:bg-surface-subtle",
  danger: "bg-danger text-foreground-on-accent hover:bg-danger-hover",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs",
  md: "px-[18px] py-[11px] text-[13.5px]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconType;
  /** Fills the row on mobile, hugs its content from `sm` up. */
  block?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  block = false,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "press-scale inline-flex items-center justify-center gap-2 rounded-control font-bold transition-all",
        "focus-visible:ring-accent-ring focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "flex-1 sm:flex-none",
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}
