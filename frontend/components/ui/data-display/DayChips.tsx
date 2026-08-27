import {
  WEEKDAYS,
  WEEKDAY_INITIAL,
  WEEKDAY_SHORT,
  Weekday,
} from "@enums/index";
import { cn } from "@utils/libs/cn";

/**
 * Read-only delivery schedule.
 *
 * Always renders all seven slots, with the off days dimmed rather than removed —
 * "Mon Wed Fri" and a seven-slot strip with four gaps carry the same facts, but
 * only the strip lets you see at a glance which days are missed.
 */
export function DayChips({
  days,
  className,
}: {
  days: Weekday[];
  className?: string;
}) {
  if (days.length === 0) {
    return (
      <span className={cn("text-foreground-subtle text-micro", className)}>
        No schedule
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex gap-0.5", className)}
      aria-label={`Delivery days: ${days.map((d) => WEEKDAY_SHORT[d]).join(", ")}`}
    >
      {WEEKDAYS.map((day) => {
        const on = days.includes(day);
        return (
          <span
            key={day}
            aria-hidden
            title={WEEKDAY_SHORT[day]}
            className={cn(
              "text-nano flex h-4.5 w-4.5 items-center justify-center rounded font-bold",
              on
                ? "bg-accent-soft text-accent-text"
                : "bg-surface-subtle text-foreground-subtle/60",
            )}
          >
            {WEEKDAY_INITIAL[day]}
          </span>
        );
      })}
    </span>
  );
}
