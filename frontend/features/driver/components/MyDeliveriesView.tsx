"use client";

import {
  LuBanknote,
  LuClock,
  LuMapPin,
  LuPackageCheck,
  LuPhone,
  LuPrinter,
  LuSearchX,
  LuTruck,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Order } from "@app-types/index";
import { Card, CardActions, PageHeader, StatCard } from "@components/ui/cards";
import { Badge } from "@components/ui/data-display";
import { SearchInput, Select } from "@components/ui/fields";
import {
  EmptyState,
  ErrorState,
  SkeletonCardGrid,
  SkeletonScreen,
  SkeletonStatCards,
} from "@components/ui/states";
import { PaymentType } from "@enums/index";
import { InvoiceModal } from "@features/orders/index";
import { useAppSelector } from "@store/hooks";
import { formatCurrency } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { useGetMyDeliveriesQuery } from "../api/driverApi";

const totalUnits = (order: Order) =>
  order.items.reduce((sum, line) => sum + line.qty, 0);

/**
 * A driver's own round. Read-only: a courier can see what to deliver, to whom,
 * where, and whether to collect — but cannot edit an order or reach the
 * registries.
 *
 * "On Credit" is the figure that matters most here, because it is the money the
 * driver has to collect at the door.
 */
export function MyDeliveriesView() {
  const user = useAppSelector((state) => state.auth.user);
  const courierId = user?.courierId ?? "";

  const {
    data: deliveries = [],
    isLoading,
    isError,
    refetch,
    // `skip` guards the case where the guard has not resolved a courier yet;
    // querying with an empty id would ask for "everyone's nothing".
  } = useGetMyDeliveriesQuery(courierId, { skip: !courierId });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | PaymentType>("");
  const [receipt, setReceipt] = useState<Order | undefined>();

  const filtered = useMemo(
    () =>
      deliveries.filter(
        (order) =>
          matchesQuery(
            search,
            order.id,
            order.customer.name,
            order.customer.phone,
            order.customer.address,
          ) &&
          (!status || order.paymentType === status),
      ),
    [deliveries, search, status],
  );

  const stats = useMemo(() => {
    const credit = deliveries.filter(
      (o) => o.paymentType === PaymentType.OnCredit,
    );
    return {
      count: deliveries.length,
      units: deliveries.reduce((n, o) => n + totalUnits(o), 0),
      toCollect: credit.reduce((n, o) => n + o.total, 0),
      collectCount: credit.length,
    };
  }, [deliveries]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Deliveries"
        subtitle={`Assigned to ${user?.name ?? "you"}`}
      />

      {isError ? null : isLoading ? (
        <SkeletonStatCards count={3} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
          <StatCard
            label="Deliveries"
            value={stats.count}
            icon={LuTruck}
            tone="accent"
            caption={`${stats.units} items to carry`}
          />
          <StatCard
            label="To Collect"
            value={formatCurrency(stats.toCollect)}
            icon={LuBanknote}
            tone={stats.toCollect > 0 ? "danger" : "success"}
            caption={`${stats.collectCount} on credit`}
          />
          <StatCard
            label="Prepaid"
            value={stats.count - stats.collectCount}
            icon={LuPackageCheck}
            tone="success"
            caption="Nothing to collect"
          />
        </div>
      )}

      <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          clearable
          placeholder="Search customer, phone, address..."
          className="w-full sm:max-w-xs"
        />
        <Select
          aria-label="Filter by payment status"
          value={status}
          onChange={(event) => setStatus(event.target.value as "" | PaymentType)}
          placeholder="All Statuses"
          options={[
            { value: PaymentType.Paid, label: "Prepaid" },
            { value: PaymentType.OnCredit, label: "Collect on delivery" },
          ]}
          className="w-full sm:w-auto"
        />
      </div>

      {isError ? (
        <ErrorState
          title="Couldn't load your deliveries"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <SkeletonScreen label="Loading your deliveries">
          <SkeletonCardGrid count={6} />
        </SkeletonScreen>
      ) : deliveries.length === 0 ? (
        <EmptyState
          message="No deliveries assigned to you yet"
          icon={LuPackageCheck}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="No deliveries match this search" icon={LuSearchX} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => {
            const collect = order.paymentType === PaymentType.OnCredit;
            return (
              <Card key={order.id} interactive padded={false}>
                <div className="p-[18px] pb-3.5">
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    <span className="text-foreground-strong font-mono text-xs font-bold">
                      {order.id}
                    </span>
                    <Badge pill tone={collect ? "danger" : "success"}>
                      {collect ? "Collect" : "Prepaid"}
                    </Badge>
                  </div>

                  <p className="text-foreground-strong truncate text-[15px] font-bold">
                    {order.customer.name}
                  </p>

                  <p className="text-foreground-body mt-2 flex items-center gap-2 text-[12.5px]">
                    <LuPhone
                      className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {/* Tappable: the driver is on a phone, at a door. */}
                    <a
                      href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
                      className="hover:text-accent-text truncate underline-offset-2 hover:underline"
                    >
                      {order.customer.phone}
                    </a>
                  </p>
                  <p className="text-foreground-muted mt-1.5 flex items-start gap-2 text-[12.5px] leading-relaxed">
                    <LuMapPin
                      className="text-foreground-subtle mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {/* Wraps, never truncates — this is the address they drive to. */}
                    <span>{order.customer.address}</span>
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-foreground-strong font-display text-xl font-bold">
                      {formatCurrency(order.total)}
                    </span>
                    <span className="text-foreground-subtle text-xs">
                      {totalUnits(order)} items
                    </span>
                  </div>
                  {collect ? (
                    <p className="text-danger-text mt-1 flex items-center gap-1.5 text-xs font-bold">
                      <LuClock className="h-3.5 w-3.5" aria-hidden />
                      Collect {formatCurrency(order.total)} on delivery
                    </p>
                  ) : null}
                </div>

                <CardActions
                  actions={[
                    {
                      label: "Receipt",
                      icon: LuPrinter,
                      tone: "accent",
                      onClick: () => setReceipt(order),
                    },
                  ]}
                />
              </Card>
            );
          })}
        </div>
      )}

      {receipt ? (
        <InvoiceModal order={receipt} onClose={() => setReceipt(undefined)} />
      ) : null}
    </div>
  );
}
