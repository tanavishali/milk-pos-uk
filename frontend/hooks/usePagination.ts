"use client";

import { useMemo, useState } from "react";
import { PAGE_SIZE } from "@constants/index";

interface UsePaginationResult<T> {
  page: number;
  setPage: (page: number) => void;
  /** Move by ±1; a step past either end is ignored rather than clamped silently. */
  step: (delta: number) => void;
  pageCount: number;
  pageItems: T[];
  startIndex: number;
  canPrev: boolean;
  canNext: boolean;
}

/**
 * Client-side slicing over a list the mock backend already returned in full.
 * The return shape is meant to keep call sites unchanged once a real backend
 * paginates server-side.
 */
export function usePagination<T>(
  items: T[],
  perPage: number = PAGE_SIZE,
): UsePaginationResult<T> {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / perPage));

  // A filter or a delete can shrink the list under the current page. Clamping
  // here rather than correcting `page` in an effect means the very first render
  // after the list shrinks is already right — an effect would paint one empty
  // page first, then fix it.
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * perPage;

  const pageItems = useMemo(
    () => items.slice(startIndex, startIndex + perPage),
    [items, startIndex, perPage],
  );

  return {
    page: safePage,
    setPage,
    step: (delta) => {
      const next = safePage + delta;
      if (next >= 1 && next <= pageCount) setPage(next);
    },
    pageCount,
    pageItems,
    startIndex,
    canPrev: safePage > 1,
    canNext: safePage < pageCount,
  };
}
