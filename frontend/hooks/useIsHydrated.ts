"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the first client render, `true` afterwards.
 *
 * Guards need this because the stored session only exists in the browser: if
 * they read it during the first render, the server's HTML (logged out) and the
 * client's (logged in) disagree and React throws a hydration mismatch.
 * `useSyncExternalStore` gives the two-pass behaviour without a state-setting
 * effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
