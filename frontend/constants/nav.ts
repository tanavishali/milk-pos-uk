import {
  LuLayoutDashboard,
  LuPackage,
  LuShoppingCart,
  LuSlidersHorizontal,
  LuTruck,
  LuUserCheck,
  LuUsers,
} from "react-icons/lu";
import type { IconType } from "react-icons";
import { paths, type AppPath } from "./path";

export interface NavItem {
  label: string;
  href: AppPath;
  icon: IconType;
  /** Shown in the chrome bar's page title, uppercased by the layout. */
  pageTitle: string;
}

export interface NavGroup {
  /** Ungrouped items (the dashboard) render without a caption. */
  caption?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      {
        label: "Dashboard",
        href: paths.dashboard,
        icon: LuLayoutDashboard,
        pageTitle: "Dashboard",
      },
    ],
  },
  {
    caption: "Cashier & POS",
    items: [
      {
        label: "Customer Orders",
        href: paths.orders,
        icon: LuShoppingCart,
        pageTitle: "Customer Transactions",
      },
      {
        label: "Customers",
        href: paths.customers,
        icon: LuUsers,
        pageTitle: "Customers Directory",
      },
    ],
  },
  {
    caption: "Inventory",
    items: [
      {
        label: "Master Items",
        href: paths.products,
        icon: LuPackage,
        pageTitle: "Master Items",
      },
      {
        label: "Delivery / Couriers",
        href: paths.couriers,
        icon: LuTruck,
        pageTitle: "Couriers & Logistics",
      },
    ],
  },
  {
    caption: "Settings & Admin",
    items: [
      {
        label: "POS Settings",
        href: paths.settings,
        icon: LuSlidersHorizontal,
        pageTitle: "Settings",
      },
      {
        label: "User Manager",
        href: paths.profile,
        icon: LuUserCheck,
        pageTitle: "User Manager",
      },
    ],
  },
];

/** Flat lookup for the chrome bar's title, keyed by pathname. */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items);

/**
 * The mobile tab bar. `orders` and `products` repeat entries from the sidebar
 * on purpose — this is the thumb-reachable subset, not a second nav model.
 */
export const bottomNavItems: NavItem[] = [
  { ...navItems[0], label: "Home" },
  { ...navItems[1], label: "Orders" },
  { ...navItems[3], label: "Items" },
];
