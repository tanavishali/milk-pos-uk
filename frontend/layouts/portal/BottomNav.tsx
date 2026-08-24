"use client";

import { LuMenu, LuPlus } from "react-icons/lu";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { bottomNavItems, paths } from "@constants/index";
import { useAppDispatch } from "@store/hooks";
import { requestNewOrder, toggleMobileSidebar } from "@store/slices/uiSlice";
import { cn } from "@utils/libs/cn";

/** Mobile-only tab bar. The thumb-reachable subset of the sidebar, plus a FAB. */
export function BottomNav() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const [home, orders, items] = bottomNavItems;
  const tabs = [home, orders];
  const trailing = [items];

  const renderTab = (item: (typeof bottomNavItems)[number]) => {
    const active = pathname.startsWith(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-col items-center gap-0.5 transition-colors",
          active ? "text-accent" : "text-foreground-muted hover:text-accent",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-[9px] font-bold">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-surface border-border fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t px-2 shadow-dropdown md:hidden">
      {tabs.map((item) => (item ? renderTab(item) : null))}

      <button
        type="button"
        onClick={() => {
          dispatch(requestNewOrder());
          router.push(paths.orders);
        }}
        aria-label="Create order"
        className="bg-accent text-foreground-on-accent border-surface press-scale -mt-5 flex h-11 w-11 items-center justify-center rounded-full border-2 shadow-dropdown"
      >
        <LuPlus className="h-5 w-5" aria-hidden />
      </button>

      {trailing.map((item) => (item ? renderTab(item) : null))}

      <button
        type="button"
        onClick={() => dispatch(toggleMobileSidebar())}
        className="text-foreground-muted hover:text-accent flex flex-col items-center gap-0.5 transition-colors"
      >
        <LuMenu className="h-4 w-4" aria-hidden />
        <span className="text-[9px] font-bold">Menu</span>
      </button>
    </nav>
  );
}
