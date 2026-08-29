import type { ReactNode } from "react";

/**
 * The controls row above every registry: filters on the left, actions on the
 * right, stacking to two rows on mobile.
 *
 * Everything wraps rather than shrinks. Between a sidebar and four controls
 * there is not always a row's worth of width — on a tablet the search box was
 * being squeezed to about a centimetre, which is a control that technically fits
 * and cannot be used. A wrapped second row costs nothing and always fits.
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
    <div className="flex flex-col items-stretch justify-between gap-2.5 lg:flex-row lg:items-center">
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {children}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  );
}
