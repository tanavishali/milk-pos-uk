"use client";

import { useState, type ReactNode } from "react";
import { LoaderBar } from "@components/ui/states";
import { useIsWriting } from "@hooks/index";
import { CategoryModal } from "@features/products/index";
import { BottomNav } from "./BottomNav";
import { Chrome } from "./Chrome";
import { Sidebar } from "./Sidebar";

/**
 * Page chrome for the whole portal: navy bar on top, sidebar beside, mobile tab
 * bar below, and the routed page in the middle.
 *
 * The shell owns the category dialog because two pieces of chrome open it (the
 * sidebar link and, on the products page, a toolbar button) — hoisting it here
 * keeps one instance rather than one per opener.
 */
export function PortalShell({ children }: { children: ReactNode }) {
  const [categoryOpen, setCategoryOpen] = useState(false);
  const writing = useIsWriting();

  return (
    <div className="bg-background relative flex h-screen flex-col overflow-hidden">
      <LoaderBar active={writing} />
      <Chrome />

      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar onAddCategory={() => setCategoryOpen(true)} />

        <main className="flex-1 space-y-4 overflow-y-auto p-3 pb-20 sm:p-5 md:pb-6 lg:p-6">
          {children}
        </main>
      </div>

      <BottomNav />

      {categoryOpen ? (
        <CategoryModal onClose={() => setCategoryOpen(false)} />
      ) : null}
    </div>
  );
}
