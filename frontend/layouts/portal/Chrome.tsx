"use client";

import { LuChevronDown, LuLogOut, LuMenu, LuUserCog } from "react-icons/lu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  APP_NAME,
  APP_TAGLINE,
  CURRENT_USER,
  navItems,
  paths,
} from "@constants/index";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { signOut } from "@store/slices/authSlice";
import { toggleMobileSidebar } from "@store/slices/uiSlice";
import { initials } from "@utils/helper/format";

/**
 * The dark navy top bar. Its colours come from the `chrome-*` token group rather
 * than the body palette, so the one dark surface in a light app stays legible
 * without every foreground token needing a dark counterpart.
 */
export function Chrome() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const [menuOpen, setMenuOpen] = useState(false);

  const pageTitle =
    navItems.find((item) => pathname.startsWith(item.href))?.pageTitle ??
    "Dashboard";

  const displayName = user?.name ?? CURRENT_USER.name;
  const displayRole = user?.role ?? CURRENT_USER.role;

  return (
    <header className="bg-chrome text-chrome-foreground relative z-30 flex h-14 shrink-0 items-center justify-between px-3 shadow-chrome sm:h-16 sm:px-6">
      <div className="flex items-center gap-2.5 sm:gap-6">
        <button
          type="button"
          onClick={() => dispatch(toggleMobileSidebar())}
          aria-label="Open menu"
          className="text-chrome-foreground-muted hover:text-chrome-foreground active:bg-chrome-hover rounded-control -ml-1 p-1.5 transition-colors md:hidden"
        >
          <LuMenu className="h-5 w-5" aria-hidden />
        </button>

        <Link href={paths.dashboard} className="flex flex-col">
          <span className="text-chrome-foreground text-base leading-tight font-extrabold tracking-wider sm:text-lg">
            {APP_NAME}
          </span>
          <span className="text-chrome-foreground-muted text-[8px] leading-none font-medium tracking-widest uppercase">
            {APP_TAGLINE}
          </span>
        </Link>

        <h2 className="text-chrome-foreground-muted border-chrome-border hidden border-l pl-6 text-xs font-extrabold tracking-widest uppercase lg:block">
          {pageTitle}
        </h2>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="bg-chrome-hover/70 hover:bg-chrome-hover border-chrome-border/60 press-scale flex items-center gap-2 rounded-full border px-2.5 py-1 transition-all"
        >
          <span className="bg-chrome-accent text-chrome flex h-6 w-6 items-center justify-center rounded-full text-xs font-black sm:h-7 sm:w-7">
            {initials(displayName)}
          </span>
          <span className="hidden text-left leading-tight sm:block">
            <span className="text-chrome-foreground block text-xs font-bold">
              {displayName}
            </span>
            <span className="text-chrome-foreground-muted block text-[9px]">
              {displayRole}
            </span>
          </span>
          <LuChevronDown
            className="text-chrome-foreground-muted h-3 w-3"
            aria-hidden
          />
        </button>

        {menuOpen ? (
          <>
            {/* Click-away layer, so the menu closes without a document listener. */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="bg-surface border-border rounded-card absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden border shadow-dropdown"
            >
              <div className="border-border-subtle border-b px-3 py-2.5">
                <p className="text-foreground truncate text-xs font-bold">
                  {displayName}
                </p>
                <p className="text-micro text-foreground-subtle truncate">
                  {user?.email ?? CURRENT_USER.email}
                </p>
              </div>

              <Link
                href={paths.profile}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="text-foreground-body hover:bg-surface-muted flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors"
              >
                <LuUserCog
                  className="text-foreground-subtle h-4 w-4"
                  aria-hidden
                />
                My Profile
              </Link>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  dispatch(signOut());
                }}
                className="text-danger-text hover:bg-danger-soft flex w-full items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-colors"
              >
                <LuLogOut className="h-4 w-4" aria-hidden />
                Sign Out
              </button>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
