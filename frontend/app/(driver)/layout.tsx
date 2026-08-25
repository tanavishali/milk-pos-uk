import type { ReactNode } from "react";
import { UserRole } from "@enums/index";
import { RoleGuard } from "@guards/index";
import { DriverShell } from "@layouts/driver/index";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard allow={UserRole.Courier}>
      <DriverShell>{children}</DriverShell>
    </RoleGuard>
  );
}
