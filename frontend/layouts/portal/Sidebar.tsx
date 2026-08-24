"use client";

import { LuTag, LuX } from "react-icons/lu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navGroups } from "@constants/index";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { setMobileSidebarOpen } from "@store/slices/uiSlice";
import { cn } from "@utils/libs/cn";

interface SidebarProps {
  /** Opens the category dialog, which lives with the products feature. */
  onAddCategory: () => void;
}

export function Sidebar({ onAddCategory }: SidebarProps) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const open = useAppSelector((state) => state.ui.mobileSidebarOpen);

  const close = () => dispatch(setMobileSidebarOpen(false));

  return (
    <>
      {/* Scrim is mobile-only: from `md` up the sidebar is part of the layout. */}
      {open ? (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "bg-surface border-border fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-r px-3 py-4",
          "transition-transform duration-300 ease-in-out",
          "md:static md:z-auto md:w-60 md:translate-x-0 md:shadow-none",
          open ? "translate-x-0 shadow-modal" : "-translate-x-full",
        )}
      >
        <div className="border-border-subtle flex items-center justify-between border-b px-3 pb-2 md:hidden">
          <span className="text-foreground-subtle text-xs font-extrabold tracking-widest uppercase">
            Main Menu
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="text-foreground-subtle hover:text-foreground-body rounded-control-sm p-1.5"
          >
            <LuX className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex flex-col gap-5">
          {navGroups.map((group, index) => (
            <div key={group.caption ?? `group-${index}`} className="space-y-1">
              {group.caption ? (
                <span className="text-foreground-subtle text-micro block px-4 font-bold tracking-wider uppercase">
                  {group.caption}
                </span>
              ) : null}

              {group.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-control flex w-full items-center gap-3 px-4 py-2.5 text-xs transition-all",
                      active
                        ? "bg-accent-soft text-accent-text font-bold shadow-card"
                        : "text-foreground-muted hover:bg-surface-subtle hover:text-foreground-strong font-semibold",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* The one action in the nav that opens a dialog rather than
                  routing — it sits under Inventory beside Master Items. */}
              {group.caption === "Inventory" ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    onAddCategory();
                  }}
                  className="text-foreground-subtle hover:bg-surface-muted hover:text-foreground-strong rounded-control flex w-full items-center gap-3 py-2 pl-7 pr-4 text-xs font-medium transition-all"
                >
                  <LuTag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Add Category</span>
                </button>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
