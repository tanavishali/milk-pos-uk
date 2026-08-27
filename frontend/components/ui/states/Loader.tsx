import { cn } from "@utils/libs/cn";

type Size = "xs" | "sm" | "md" | "lg";

// Border width scales with the ring so a 12px spinner does not read as a solid
// dot and a 28px one does not read as a hairline.
const sizes: Record<Size, string> = {
  xs: "h-3 w-3 border",
  sm: "h-3.5 w-3.5 border-[1.5px]",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[2.5px]",
};

interface LoaderProps {
  size?: Size;
  /**
   * Announced by screen readers. Omit inside a control that already says it is
   * busy — a spinner beside "Deleting..." should not be read out twice.
   */
  label?: string;
  className?: string;
}

/**
 * The spinner. Every "something is happening" in the app is this ring, at one of
 * four sizes.
 *
 * Drawn in `currentColor`, so dropping it into a button, a table cell or the
 * navy chrome takes the colour of whatever it sits in rather than needing a tone
 * prop per context.
 *
 * A spinner rather than a skeleton because the two answer different questions: a
 * skeleton stands in for content that is about to appear, a spinner says the
 * thing you just clicked is still running. Reaching for a skeleton after a click
 * would mean blanking out the very row the user is acting on.
 */
export function Loader({ size = "sm", label, className }: LoaderProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full border-current border-t-transparent",
        sizes[size],
        className,
      )}
    />
  );
}

/**
 * Covers a region while an operation runs on it — needs a `relative` parent.
 *
 * Two jobs, not one: it says the operation is running, and it takes the clicks.
 * The order wizard's cart is editable right up to the moment it is issued, and a
 * quantity changed mid-issue would land on a receipt that had already been
 * priced.
 */
export function LoaderOverlay({
  label = "Working...",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "bg-surface/75 animate-fade-in absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]",
        className,
      )}
    >
      <Loader size="md" className="text-accent" />
      <p className="text-foreground-muted text-micro font-bold">{label}</p>
    </div>
  );
}

/**
 * A hairline at the very top of the shell, running whenever a write is in
 * flight anywhere in the app.
 *
 * The per-button spinners below are the specific answer — this is the general
 * one. Any action that reaches the data layer shows up here whether or not
 * whoever wrote it remembered to thread a loading prop through, which is what
 * keeps "I clicked and nothing happened" from coming back with the next feature.
 *
 * Kept mounted and faded rather than mounted on demand: a bar that appears and
 * vanishes within 300ms reads as a glitch, a bar that fades reads as progress.
 */
export function LoaderBar({
  active,
  label = "Saving changes",
}: {
  active: boolean;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-hidden={active ? undefined : true}
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 h-[3px] overflow-hidden transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {active ? <span className="sr-only">{label}</span> : null}
      <div className="bg-accent-soft h-full w-full">
        {/* Indeterminate: the mock data layer reports no progress, and a fake
            percentage would be a lie about how far along the write is. */}
        <div
          className={cn(
            "bg-accent h-full w-1/3 rounded-full",
            active && "animate-loader-track",
          )}
        />
      </div>
    </div>
  );
}
