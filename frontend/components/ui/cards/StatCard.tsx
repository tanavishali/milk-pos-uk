import { LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import type { IconType } from "react-icons";
import { cn } from "@utils/libs/cn";

type Tone = "neutral" | "success" | "accent" | "danger";

const iconTones: Record<Tone, string> = {
  neutral: "bg-surface-subtle text-foreground-muted",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent",
  danger: "bg-danger-soft text-danger",
};

interface StatCardProps {
  label: string;
  value: string | number;
  /** For grid placement — e.g. spanning an odd card across a 2-column row. */
  className?: string;
  icon: IconType;
  tone?: Tone;
  /** e.g. "+8.5%". Sign decides the arrow direction and the colour. */
  delta?: string;
  deltaCaption?: string;
  /** Footer line for a figure with no trend — shown when `delta` is absent. */
  caption?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  delta,
  deltaCaption = "from yesterday",
  caption,
  className,
}: StatCardProps) {
  const isNegative = delta?.trim().startsWith("-") ?? false;
  const DeltaIcon = isNegative ? LuTrendingDown : LuTrendingUp;

  return (
    <div
      className={cn(
        "hover-lift bg-surface border-border rounded-card flex h-28 flex-col justify-between border p-3 shadow-card sm:h-32 sm:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-micro text-foreground-subtle sm:text-label font-bold tracking-tight uppercase">
            {label}
          </p>
          <h3 className="text-foreground-strong font-display mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">
            {value}
          </h3>
        </div>
        <div
          className={cn(
            "rounded-control flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8",
            iconTones[tone],
          )}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
        </div>
      </div>

      {delta ? (
        <div
          className={cn(
            "text-nano sm:text-label flex items-center gap-1 font-bold",
            isNegative ? "text-danger" : "text-success",
          )}
        >
          <DeltaIcon className="h-3 w-3" aria-hidden />
          <span>{delta}</span>
          <span className="text-foreground-subtle hidden font-normal sm:inline">
            {deltaCaption}
          </span>
        </div>
      ) : caption ? (
        <p className="text-foreground-subtle text-micro sm:text-label font-semibold">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
