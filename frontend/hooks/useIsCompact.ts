"use client";

import { useSyncExternalStore } from "react";

/** Below Tailwind's `sm`: a phone held in one hand. */
const QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * True on a phone-sized viewport.
 *
 * Exists so a layout can *change shape*, not just reflow — the registries drop
 * their table for cards below `sm`, because a seven-column table on a 360px
 * screen is a horizontal scrollbar pretending to be a layout. Anything that can
 * be expressed in CSS should stay in CSS; this is for the cases where the
 * markup itself has to differ.
 *
 * `useSyncExternalStore` rather than an effect: it subscribes to the media
 * query directly, so there is no state-setting effect and no first paint at the
 * wrong size. The server snapshot is `false` — SSR has no viewport, and the
 * desktop shape is the safe assumption for markup that is about to be replaced
 * on the client anyway.
 */
export function useIsCompact(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
