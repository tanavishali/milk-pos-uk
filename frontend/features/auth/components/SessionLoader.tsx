"use client";

import { useEffect, type ReactNode } from "react";
import { readSession } from "@features/auth/utils/session";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { restoreSession } from "@store/slices/authSlice";

/**
 * Rehydrates a stored session into Redux once, after mount.
 *
 * This has to be an effect: `sessionStorage` does not exist during SSR, so
 * reading it any earlier would make the server and client render different
 * trees. Runs once, and only dispatches when there is something to restore.
 */
export function SessionLoader({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (user) return;
    const stored = readSession();
    if (stored) dispatch(restoreSession(stored));
    // Mount only: later sign-in/out changes go through the slice directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
