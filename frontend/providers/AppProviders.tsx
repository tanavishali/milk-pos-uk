"use client";

import type { ReactNode } from "react";
import { SessionLoader } from "@features/auth/index";
import { StoreProvider } from "./StoreProvider";

/** Every app-wide provider, composed once and mounted by the root layout. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <SessionLoader>{children}</SessionLoader>
    </StoreProvider>
  );
}
