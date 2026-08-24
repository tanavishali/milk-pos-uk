import { cn } from "@utils/libs/cn";

/**
 * One shimmering placeholder block. Everything below composes this, so the sweep
 * timing is identical across the app — several elements animating out of phase
 * reads as jank rather than loading.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-surface-inset rounded-control-sm skeleton-sheen",
        className,
      )}
    />
  );
}

/**
 * Wraps a skeleton screen so assistive tech announces "loading" once, instead of
 * reading out a page of meaningless blocks.
 */
export function SkeletonScreen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** The four metric tiles at the top of the dashboard. */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-surface border-border rounded-card flex h-28 flex-col justify-between border p-3 shadow-card sm:h-32 sm:p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="rounded-control h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <Skeleton className="h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
}

/** A card the shape of the registry grid cards. */
export function SkeletonCardGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="bg-surface border-border rounded-card space-y-2.5 border p-3.5 shadow-card"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/2" />
          <div className="border-border-subtle border-t pt-2">
            <Skeleton className="h-2.5 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rows the shape of the registry tables. */
export function SkeletonTable({
  rows = 8,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-surface border-border rounded-card overflow-hidden border shadow-card">
      <div className="bg-surface-muted border-border flex gap-4 border-b px-3 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Skeleton key={index} className="h-2.5 flex-1" />
        ))}
      </div>
      <div className="divide-border-subtle divide-y">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-3 py-3.5">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton
                key={colIndex}
                // Varying widths per column so the block reads as tabular data
                // rather than a grid of identical bars.
                className={cn(
                  "h-3 flex-1",
                  colIndex === 0 && "max-w-[9rem]",
                  colIndex === columns - 1 && "max-w-[5rem]",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The pagination bar, so the page height doesn't jump when data lands. */
export function SkeletonPagination() {
  return (
    <div className="bg-surface border-border rounded-card flex items-center justify-between border p-3 shadow-card">
      <Skeleton className="h-3 w-36" />
      <div className="flex gap-1">
        <Skeleton className="rounded-control h-6 w-12" />
        <Skeleton className="rounded-control h-6 w-12" />
      </div>
    </div>
  );
}

/** A generic panel — used for the dashboard's three info widgets. */
export function SkeletonPanel({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-surface border-border rounded-card border p-3.5 shadow-card",
        className,
      )}
    >
      <Skeleton className="mb-3 h-3 w-32" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
