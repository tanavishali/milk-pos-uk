"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { paths } from "@constants/index";
import { useIsHydrated } from "@hooks/useIsHydrated";
import { useAppSelector } from "@store/hooks";
import { homeFor } from "./RoleGuard";
import { RouteSplash } from "./RouteSplash";

/** The mirror of `AuthGuard`: keeps a signed-in user off the login screen. */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    // A courier must not be dropped on the admin dashboard.
    if (hydrated && user) router.replace(homeFor(user.role));
  }, [hydrated, user, router]);

  if (!hydrated || user) return <RouteSplash />;

  return <>{children}</>;
}
