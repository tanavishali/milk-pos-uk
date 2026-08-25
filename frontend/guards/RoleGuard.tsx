"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { paths } from "@constants/index";
import { UserRole } from "@enums/index";
import { useIsHydrated } from "@hooks/useIsHydrated";
import { useAppSelector } from "@store/hooks";
import { RouteSplash } from "./RouteSplash";

/** Where each role belongs when it lands somewhere it shouldn't. */
export function homeFor(role: UserRole | undefined): string {
  return role === UserRole.Courier ? paths.myDeliveries : paths.dashboard;
}

/**
 * Restricts a route group to one role, and sends anyone else to their own home
 * rather than to a dead end.
 *
 * **Not a security boundary.** Like `AuthGuard`, this runs in the browser and
 * every page is statically rendered — it decides what UI to show, not what data
 * exists. A courier who forged a session could still call the endpoints; scoping
 * has to be enforced by the API once there is one.
 */
export function RoleGuard({
  allow,
  children,
}: {
  allow: UserRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const user = useAppSelector((state) => state.auth.user);

  const allowed = user?.role === allow;

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace(paths.login);
    } else if (!allowed) {
      router.replace(homeFor(user.role));
    }
  }, [hydrated, user, allowed, router]);

  if (!hydrated || !allowed) return <RouteSplash />;

  return <>{children}</>;
}
