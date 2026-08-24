import type { ReactNode } from "react";

/**
 * The controls row above every registry: filters on the left, actions on the
 * right, stacking to two rows on mobile.
 *
 * Deliberately **unboxed** — no card, border or shadow. The row sits directly on
 * the page so the only framed thing on screen is the data itself; a white bar
 * above a white table read as two panels competing for the same edge. Each
 * control keeps its own border, which is what makes it legible against the grey.
 */
export function Toolbar({
  children,
  actions,
}: {
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch justify-between gap-2.5 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {children}
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
