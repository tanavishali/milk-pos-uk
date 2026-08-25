import type { ReactNode } from "react";
import { UserRole } from "@enums/index";
import { RoleGuard } from "@guards/index";
import { PortalShell } from "@layouts/portal/index";

/**
 * `RoleGuard` rather than `AuthGuard`: being signed in is not enough for the
 * admin terminal. A courier who reaches one of these URLs is sent to their own
 * deliveries instead of being shown a registry.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={UserRole.Admin}>
      <PortalShell>{children}</PortalShell>
    </RoleGuard>
  );
}
