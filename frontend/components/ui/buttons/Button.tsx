"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { IconType } from "react-icons";
import { cn } from "@utils/libs/cn";
import { Loader } from "../states/Loader";

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
  /**
   * Swaps the icon for a spinner and stops further clicks. Every asynchronous
   * action in the app passes its mutation's `isLoading` here — a button that
   * looks idle while its request is in flight is the one thing a cashier will
   * respond to by clicking again.
   */
  loading?: boolean;
  /** What to say while `loading` — "Saving...", "Deleting...". */
  loadingLabel?: string;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  block = false,
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // Disabled as well as busy: `aria-busy` alone still submits the form on a
      // second click, which would issue the same order twice.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "press-scale inline-flex items-center justify-center gap-2 rounded-control font-bold transition-all",
        "focus-visible:ring-accent-ring focus-visible:ring-2 focus-visible:outline-none",
        "disabled:pointer-events-none",
        // A loading button is working, not unavailable — fading it out would
        // read as "this control is off" at the exact moment it is busiest.
        loading ? "disabled:opacity-100" : "disabled:opacity-50",
        variants[variant],
        sizes[size],
        block && "flex-1 sm:flex-none",
        className,
      )}
      {...rest}
    >
      {/* The spinner takes the icon's place rather than sitting beside it, so
          the button keeps its width and the row does not reflow mid-click. */}
      {loading ? (
        <Loader size={size === "sm" ? "xs" : "sm"} className="h-4 w-4" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
      ) : null}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
