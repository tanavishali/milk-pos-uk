"use client";

import { rangeLabel } from "@utils/helper/format";
import { Button } from "../buttons/Button";

interface PaginationProps {
  startIndex: number;
  /** Rows rendered on the current page, for the "Showing X-Y of Z" readout. */
  pageItemCount: number;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onStep: (delta: number) => void;
}

export function Pagination({
  startIndex,
  pageItemCount,
  total,
  canPrev,
  canNext,
  onStep,
}: PaginationProps) {
  return (
    <div className="bg-surface border-border rounded-card flex items-center justify-between border p-3 shadow-card">
      <span
        aria-live="polite"
        className="text-foreground-muted text-xs font-semibold"
      >
        {rangeLabel(startIndex, pageItemCount, total)}
      </span>
      <div className="flex gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onStep(-1)}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onStep(1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
