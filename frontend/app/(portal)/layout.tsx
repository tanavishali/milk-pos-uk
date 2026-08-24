import type { ReactNode } from "react";
import { AuthGuard } from "@guards/index";
import { PortalShell } from "@layouts/portal/index";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <PortalShell>{children}</PortalShell>
    </AuthGuard>
  );
}
