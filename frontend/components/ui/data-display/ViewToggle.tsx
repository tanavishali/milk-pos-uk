"use client";

import { LuLayoutGrid, LuList } from "react-icons/lu";
import { ViewMode } from "@enums/index";
import { cn } from "@utils/libs/cn";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  /** Which mode sits on the left — products lead with grid, the rest with list. */
  order?: [ViewMode, ViewMode];
}

const icons = {
  [ViewMode.Grid]: LuLayoutGrid,
  [ViewMode.List]: LuList,
} as const;

const labels = {
  [ViewMode.Grid]: "Grid view",
  [ViewMode.List]: "List view",
} as const;

/**
 * A roving-tabindex radio group: one tab stop, arrows move between the two
 * options. A pair of plain buttons would put two stops in every toolbar.
 */
export function ViewToggle({
  value,
  onChange,
  order = [ViewMode.List, ViewMode.Grid],
}: ViewToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="bg-surface border-border rounded-control flex items-center border p-1"
    >
      {order.map((mode) => {
        const Icon = icons[mode];
        const selected = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={labels[mode]}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(mode)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                onChange(order.find((m) => m !== value) ?? value);
              }
            }}
            className={cn(
              "rounded-control-sm p-1.5 transition-colors",
              "focus-visible:ring-accent-ring focus-visible:ring-2 focus-visible:outline-none",
              selected
                ? "bg-accent-soft text-accent-text"
                : "text-foreground-subtle hover:text-foreground-body",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
