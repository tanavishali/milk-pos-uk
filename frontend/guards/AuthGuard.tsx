"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { paths } from "@constants/index";
import { useIsHydrated } from "@hooks/useIsHydrated";
import { useAppSelector } from "@store/hooks";
import { RouteSplash } from "./RouteSplash";

/**
 * Keeps signed-out visitors out of the portal.
 *
 * **Not a security boundary** — every page here is statically rendered and the
 * check runs in the browser, so this hides the UI, it does not protect data.
 * Real enforcement belongs on the API once there is one.
 *
 * Renders a splash until hydration so the stored session can be read; without
 * that wait, a signed-in refresh would flash the login screen.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (hydrated && !user) router.replace(paths.login);
  }, [hydrated, user, router]);

  if (!hydrated || !user) return <RouteSplash />;

  return <>{children}</>;
}
