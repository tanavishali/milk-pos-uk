import type { ReactNode } from "react";

/**
 * The page's own title, above the stats and the filter row.
 *
 * Sits here with `Toolbar` rather than in a category of its own: both are page
 * furniture that frames a registry, and neither is a card.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Optional trailing controls, for a page whose action belongs at the top. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-foreground-strong font-display text-lg font-bold sm:text-xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-foreground-muted mt-0.5 text-xs sm:text-[13px]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
