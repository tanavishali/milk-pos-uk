"use client";

import type { ButtonHTMLAttributes } from "react";
import type { IconType } from "react-icons";
import { cn } from "@utils/libs/cn";

type Tone = "neutral" | "accent" | "danger";

const tones: Record<Tone, string> = {
  neutral: "text-foreground-subtle hover:text-foreground-body",
  accent: "text-foreground-subtle hover:text-accent",
  danger: "text-foreground-subtle hover:text-danger",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconType;
  /** Required: the button has no text, so this is its only accessible name. */
  label: string;
  tone?: Tone;
}

export function IconButton({
  icon: Icon,
  label,
  tone = "neutral",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-control-sm p-1 transition-colors",
        "focus-visible:ring-accent-ring focus-visible:ring-2 focus-visible:outline-none",
        tones[tone],
        className,
      )}
      {...rest}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}
