"use client";

import { WEEKDAYS, WEEKDAY_SHORT, Weekday } from "@enums/index";
import { cn } from "@utils/libs/cn";

interface DayPickerProps {
  value: Weekday[];
  onChange: (days: Weekday[]) => void;
  /** Labels the group for assistive tech; the visible label comes from FormField. */
  label?: string;
}

/**
 * Seven toggles rather than a text input or a multi-select.
 *
 * A milk round is set by tapping days, and the whole week has to be visible at
 * once so the gaps are as obvious as the deliveries — a `<select multiple>`
 * hides exactly the thing being decided.
 */
export function DayPicker({
  value,
  onChange,
  label = "Delivery days",
}: DayPickerProps) {
  const toggle = (day: Weekday) =>
    onChange(
      value.includes(day) ? value.filter((d) => d !== day) : [...value, day],
    );

  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {WEEKDAYS.map((day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(day)}
            className={cn(
              "rounded-control min-w-11 border px-2.5 py-2 text-xs font-bold transition-colors",
              "focus-visible:ring-accent-ring focus-visible:ring-2 focus-visible:outline-none",
              on
                ? "border-accent bg-accent text-foreground-on-accent"
                : "border-border-input bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground-body",
            )}
          >
            {WEEKDAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}
