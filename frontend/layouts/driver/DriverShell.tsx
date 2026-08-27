"use client";

import { LuLogOut } from "react-icons/lu";
import type { ReactNode } from "react";
import { LoaderBar } from "@components/ui/states";
import { APP_NAME } from "@constants/index";
import { useIsWriting } from "@hooks/index";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { signOut } from "@store/slices/authSlice";
import { initials } from "@utils/helper/format";

/**
 * Chrome for the driver portal: a bar and the page, nothing else.
 *
 * Deliberately not `PortalShell` — that carries the admin sidebar and the
 * order-creation button, and a shell whose navigation is conditionally emptied
 * is a shell that leaks the day someone forgets a condition. One route, one
 * visible action.
 */
export function DriverShell({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const name = user?.name ?? "Courier";
  const writing = useIsWriting();

  return (
    <div className="bg-background relative flex min-h-screen flex-col">
      <LoaderBar active={writing} />
      <header className="bg-chrome text-chrome-foreground flex h-14 shrink-0 items-center justify-between px-4 sm:h-16 sm:px-6">
        <div className="flex flex-col">
          <span className="text-chrome-foreground text-base leading-tight font-extrabold tracking-wider sm:text-lg">
            {APP_NAME}
          </span>
          <span className="text-chrome-foreground-muted text-[8px] leading-none font-medium tracking-widest uppercase">
            Driver
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-chrome-accent text-chrome flex h-7 w-7 items-center justify-center rounded-full text-xs font-black">
              {initials(name)}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="text-chrome-foreground block text-xs font-bold">
                {name}
              </span>
              <span className="text-chrome-foreground-muted block text-[9px]">
                {user?.title ?? "Courier"}
              </span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => dispatch(signOut())}
            className="text-chrome-foreground-muted hover:text-chrome-foreground hover:bg-chrome-hover rounded-control press-scale flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold transition-colors"
          >
            <LuLogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="flex-1 p-3 sm:p-5 lg:p-6">{children}</main>
    </div>
  );
}
