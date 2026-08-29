"use client";

import {
  LuBanknote,
  LuDollarSign,
  LuTriangleAlert,
  LuUsers,
} from "react-icons/lu";
import { Card, StatCard } from "@components/ui/cards";
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
  SkeletonStatCards,
} from "@components/ui/states";
import { formatCurrency } from "@utils/helper/format";
import {
  useGetDashboardMetricsQuery,
  useGetRecentOrdersQuery,
} from "../api/dashboardApi";
import { DashboardFilters } from "./DashboardFilters";
import { InventoryFlowCard } from "./InventoryFlowCard";
import { PopularItemsCard } from "./PopularItemsCard";

export function DashboardView() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    isError: metricsError,
    refetch: refetchMetrics,
  } = useGetDashboardMetricsQuery();
  const {
    data: recent = [],
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useGetRecentOrdersQuery(4);

  // Both queries feed one screen, so one failure fails the screen — showing
  // half a dashboard with the other half silently zeroed would be worse.
  if (metricsError || recentError) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        onRetry={() => {
          void refetchMetrics();
          void refetchRecent();
        }}
      />
    );
  }

  // The filter row is real markup even while loading — it is local state, so
  // there is nothing to wait for and nothing gained by greying it out.
  if (metricsLoading || recentLoading) {
    return (
      <SkeletonScreen label="Loading dashboard">
        <div className="space-y-3.5 sm:space-y-5">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="rounded-control h-9 w-56" />
            <Skeleton className="rounded-control h-8 w-20" />
          </div>
          <SkeletonStatCards />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <SkeletonPanel lines={4} />
            <SkeletonPanel lines={3} />
            <SkeletonPanel lines={2} />
          </div>
        </div>
      </SkeletonScreen>
    );
  }

  return (
    <div className="space-y-3.5 sm:space-y-5">
      <DashboardFilters />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Gross Profit"
          value={formatCurrency(metrics?.grossProfit ?? 0)}
          icon={LuDollarSign}
          delta="+8.5%"
        />
        <StatCard
          label="Collected"
          value={formatCurrency(metrics?.collected ?? 0)}
          icon={LuBanknote}
          tone="success"
          caption={`${metrics?.totalOrders ?? 0} bills raised`}
        />
        <StatCard
          label="Customers"
          value={metrics?.totalCustomers ?? 0}
          icon={LuUsers}
          tone="accent"
          delta="+4.2%"
        />
        {/* Billed less collected: on a credit round this is the number that
            matters, and the old model could not produce it. */}
        <StatCard
          label="Outstanding"
          value={formatCurrency(metrics?.outstanding ?? 0)}
          icon={LuTriangleAlert}
          tone={(metrics?.outstanding ?? 0) > 0 ? "danger" : "success"}
          caption="Out with customers"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card>
          <h4 className="text-foreground mb-2 text-xs font-extrabold">
            Latest Transactions
          </h4>
          {recent.length === 0 ? (
            <EmptyState inset message="No transactions yet." />
          ) : (
            <div className="space-y-1.5 text-xs">
              {recent.map((order) => (
                <div
                  key={order.id}
                  className="border-border-subtle hover:bg-surface-muted flex items-center justify-between gap-2 rounded px-1 py-1.5 transition-colors last:border-0 not-last:border-b"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate font-bold">
                      {order.customer.name}
                    </p>
                    <p className="text-micro text-foreground-subtle">
                      {order.id} &bull; {order.status}
                    </p>
                  </div>
                  <span className="text-foreground-strong shrink-0 font-extrabold">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <PopularItemsCard />
        <InventoryFlowCard />
      </div>
    </div>
  );
}
