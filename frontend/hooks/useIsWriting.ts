"use client";

import { QueryStatus } from "@reduxjs/toolkit/query";
import { useAppSelector } from "@store/hooks";

/**
 * True while the app is busy with something the user set off: a write, or the
 * refetch a write triggers.
 *
 * Reads RTK Query's own bookkeeping rather than a flag of our own — every
 * request goes through it, so a feature added later cannot forget to register.
 * That is the point: it is what makes the shell's loader bar unmissable without
 * threading a loading prop through the tree.
 *
 * First loads are deliberately excluded. A query with no data yet is already
 * covered by a skeleton, and a bar on top of it would double up on every page
 * open; a query that is refetching *with* data on screen has nothing else
 * saying so, which is exactly the case where the row a cashier just saved has
 * not appeared yet.
 *
 * Returns a boolean, so a selector that rebuilds its array on every store event
 * still only re-renders the shell when busy actually flips.
 */
export function useIsWriting(): boolean {
  return useAppSelector((state) => {
    const pending = (entry?: { status?: QueryStatus }) =>
      entry?.status === QueryStatus.pending;

    return (
      Object.values(state.api.mutations).some(pending) ||
      Object.values(state.api.queries).some(
        (entry) => pending(entry) && entry?.data !== undefined,
      )
    );
  });
}
