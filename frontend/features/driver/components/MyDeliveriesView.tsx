"use client";

import {
  LuBanknote,
  LuClock,
  LuHandCoins,
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
import { PaymentStatus } from "@enums/index";
import { InvoiceModal } from "@features/orders/index";
import { RecordPaymentModal } from "@features/payments/index";
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
 * The figure that matters most is the account balance, because that is the money
 * the driver has to ask for at the door — this delivery plus anything the
 * customer said they would clear next time. Collecting it is the one write a
 * courier can make.
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
  const [status, setStatus] = useState<"" | PaymentStatus>("");
  // Ids rather than rows — see the note in OrdersView: collecting at the door
  // changes what the receipt beside it should say.
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [collectingId, setCollectingId] = useState<string | undefined>();

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
            order.customer.postcode,
          ) &&
          (!status || order.status === status),
      ),
    [deliveries, search, status],
  );

  const receipt = deliveries.find((order) => order.id === receiptId);
  const collecting = deliveries.find((order) => order.id === collectingId);

  const stats = useMemo(() => {
    const open = deliveries.filter((o) => o.status !== PaymentStatus.Paid);
    // One figure per customer, not per delivery: two bills on the same account
    // share one balance, and adding both rows would ask the driver to collect
    // the same money twice.
    const byCustomer = new Map<string, number>();
    for (const order of deliveries) {
      byCustomer.set(order.customerId, order.customerBalance);
    }
    return {
      count: deliveries.length,
      units: deliveries.reduce((n, o) => n + totalUnits(o), 0),
      toCollect: [...byCustomer.values()].reduce((n, amount) => n + amount, 0),
      collectCount: open.length,
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
            caption={`${stats.collectCount} still open`}
          />
          <StatCard
            className="col-span-2 lg:col-span-1"
            label="Settled"
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
          onChange={(event) =>
            setStatus(event.target.value as "" | PaymentStatus)
          }
          placeholder="All Statuses"
          options={[
            { value: PaymentStatus.Unpaid, label: "Collect on delivery" },
            { value: PaymentStatus.Partial, label: "Part paid" },
            { value: PaymentStatus.Paid, label: "Settled" },
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
        <EmptyState
          message="No deliveries match this search"
          icon={LuSearchX}
        />
      ) : (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => {
            const collect = order.customerBalance > 0;
            return (
              <Card key={order.id} interactive padded={false}>
                <div className="flex-1 p-[18px] pb-3.5">
                  <div className="mb-2.5 flex items-start justify-between gap-2">
                    <span className="text-foreground-strong font-mono text-xs font-bold">
                      {order.id}
                    </span>
                    <Badge
                      pill
                      tone={
                        order.status === PaymentStatus.Paid
                          ? "success"
                          : order.status === PaymentStatus.Partial
                            ? "info"
                            : "danger"
                      }
                    >
                      {order.status}
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
                    <span>
                      {/* Area first: on a phone at the kerb, the patch name is
                          what tells the driver they are in the right place. */}
                      <span className="text-foreground-body font-semibold">
                        {order.customer.area}
                      </span>
                      <br />
                      {order.customer.address}
                      {order.customer.postcode ? (
                        <span className="text-foreground-body font-semibold">
                          {" "}
                          &middot; {order.customer.postcode}
                        </span>
                      ) : null}
                    </span>
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    {/* The goods in the crate for this door. */}
                    <span className="text-foreground-strong font-display text-xl font-bold">
                      {formatCurrency(order.total)}
                    </span>
                    <span className="text-foreground-subtle text-xs">
                      {totalUnits(order)} items
                    </span>
                  </div>
                  {/* What to actually ask for is the running account balance,
                      not this bill — a customer three weeks behind owes more
                      than what is in today's crate.
                      But only the open bill gives the instruction. The same
                      balance shows on every card for that customer, and "ask
                      for £14.50" printed twice reads as £29 to collect. A bill
                      that is already settled just states the account. */}
                  {order.status !== PaymentStatus.Paid ? (
                    <p className="text-danger-text mt-1 flex items-center gap-1.5 text-xs font-bold">
                      <LuClock className="h-3.5 w-3.5" aria-hidden />
                      Ask for {formatCurrency(order.customerBalance)}
                    </p>
                  ) : collect ? (
                    <p className="text-warning-text mt-1 text-xs font-bold">
                      Settled &middot; {formatCurrency(order.customerBalance)}{" "}
                      open on other bills
                    </p>
                  ) : (
                    <p className="text-success-text mt-1 text-xs font-bold">
                      Account clear — nothing to collect
                    </p>
                  )}
                  {order.receivedAtDelivery > 0 ? (
                    <p className="text-foreground-subtle text-micro mt-0.5">
                      {formatCurrency(order.receivedAtDelivery)} already taken
                      here
                    </p>
                  ) : null}
                </div>

                <CardActions
                  actions={[
                    {
                      label: "Receipt",
                      icon: LuPrinter,
                      tone: "accent",
                      onClick: () => setReceiptId(order.id),
                    },
                    {
                      label: "Collect",
                      icon: LuHandCoins,
                      tone: "info",
                      onClick: () => setCollectingId(order.id),
                    },
                  ]}
                />
              </Card>
            );
          })}
        </div>
      )}

      {receipt ? (
        <InvoiceModal
          order={receipt}
          onCollect={() => {
            setCollectingId(receipt.id);
            setReceiptId(undefined);
          }}
          onClose={() => setReceiptId(undefined)}
        />
      ) : null}

      {collecting ? (
        <RecordPaymentModal
          order={collecting}
          // The courier's own name goes on the payment: the round's cash has to
          // be traceable to whoever took it.
          receivedBy={user?.name ?? "Courier"}
          onClose={() => setCollectingId(undefined)}
        />
      ) : null}
    </div>
  );
}
