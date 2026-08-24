"use client";

import { LuChevronDown } from "react-icons/lu";
import { useState } from "react";
import { cn } from "@utils/libs/cn";

const SCOPES = ["General", "Inventory", "Cashier"] as const;

/**
 * Presentational only — the source app's tabs and year picker did not filter
 * anything either. Kept because the dashboard's layout reads wrong without the
 * row, and marked here so nobody assumes the wiring exists.
 */
export function DashboardFilters() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("General");

  return (
    <div className="flex items-center justify-between gap-2">
      <div
        role="tablist"
        aria-label="Dashboard scope"
        className="bg-surface border-border rounded-control flex items-center gap-1 border p-1 text-label font-bold shadow-card sm:text-xs"
      >
        {SCOPES.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={scope === option}
            onClick={() => setScope(option)}
            className={cn(
              "rounded-control-sm px-2.5 py-1.5 transition-colors sm:px-4",
              scope === option
                ? "bg-accent-soft text-accent-text shadow-card"
                : "text-foreground-subtle hover:text-foreground-body",
            )}
          >
            {option}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="bg-surface border-border text-foreground-body rounded-control flex items-center gap-1.5 border px-3 py-1.5 text-label font-bold shadow-card sm:text-xs"
      >
        <span>2026</span>
        <LuChevronDown
          className="text-foreground-subtle h-3.5 w-3.5"
          aria-hidden
        />
      </button>
    </div>
  );
}
