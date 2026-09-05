"use client";

import type { IconType } from "react-icons";
import { cn } from "@utils/libs/cn";

type Tone = "neutral" | "accent" | "info" | "danger";

/**
 * Each action rests in the same muted grey and only reveals its colour on hover,
 * so a row of three does not read as three competing buttons — the destructive
 * one announces itself at the moment you reach for it.
 */
const tones: Record<Tone, string> = {
  neutral: "hover:bg-surface-subtle hover:text-foreground-body",
  accent: "hover:bg-accent-soft hover:text-accent-text",
  info: "hover:bg-info-soft hover:text-info-text",
  danger: "hover:bg-danger-soft hover:text-danger-text",
};

export interface CardAction {
  label: string;
  icon: IconType;
  onClick: () => void;
  tone?: Tone;
  /**
   * Greyed and unclickable, but still in the row. An action that vanishes takes
   * its own explanation with it — the card silently grows a different set of
   * buttons and nobody can tell whether the thing is gone or just not available
   * here.
   */
  disabled?: boolean;
}

/**
 * The action bar along the bottom edge of a registry card: full-bleed, equal
 * thirds, hairline dividers between them.
 *
 * Replaces a huddle of small icon buttons in the card's corner — these are
 * proper targets with visible labels, which matters on a touch screen at a till.
 */
export function CardActions({ actions }: { actions: CardAction[] }) {
  return (
    <div className="border-border-subtle divide-border-subtle flex divide-x border-t">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={cn(
              "text-foreground-muted flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors",
              "focus-visible:ring-accent-ring focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none",
              // No hover tone once it is off: colour on hover would promise a
              // press that never lands.
              action.disabled
                ? "text-foreground-subtle cursor-not-allowed opacity-50"
                : tones[action.tone ?? "neutral"],
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {action.label}
          </button>
        );
      })}
    </div>
  );
}
