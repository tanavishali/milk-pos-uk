import type { ReactNode } from "react";
import { GuestGuard } from "@guards/index";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <GuestGuard>{children}</GuestGuard>;
}
