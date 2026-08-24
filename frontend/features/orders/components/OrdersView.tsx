"use client";

import {
  LuBanknote,
  LuCirclePlus,
  LuClock,
  LuPrinter,
  LuReceiptText,
  LuSearchX,
  LuShoppingBag,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Order } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import {
  Card,
  CardActions,
  PageHeader,
  StatCard,
  Toolbar,
} from "@components/ui/cards";
import { SearchInput, Select } from "@components/ui/fields";
import {
  Badge,
  Pagination,
  Table,
  TableCell,
  TableRow,
  ViewToggle,
} from "@components/ui/data-display";
import {
  EmptyState,
  ErrorState,
  RegistrySkeleton,
  SkeletonStatCards,
} from "@components/ui/states";
import { PaymentType, ViewMode } from "@enums/index";
import { usePagination } from "@hooks/usePagination";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { clearNewOrderRequest, setViewMode } from "@store/slices/uiSlice";
import { formatCurrency } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { useGetOrdersQuery } from "../api/ordersApi";
import { InvoiceModal } from "./InvoiceModal";
import { OrderWizard } from "./OrderWizard";

const totalUnits = (order: Order) =>
  order.items.reduce((sum, line) => sum + line.qty, 0);

const paymentTone = (type: PaymentType) =>
  type === PaymentType.OnCredit ? "warning" : "success";

export function OrdersView() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewModes.orders);
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useGetOrdersQuery();

  const [locallyOpen, setLocallyOpen] = useState(false);
  const [receipt, setReceipt] = useState<Order | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | PaymentType>("");

  // Address is searchable too: "which orders go to Gulberg?" is a dispatch
  // question a cashier actually asks, and the address is on the order already.
  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesQuery(
            search,
            order.id,
            order.customer.name,
            order.customer.phone,
            order.customer.address,
            order.courier,
          ) &&
          (!status || order.paymentType === status),
      ),
    [orders, search, status],
  );

  // The mobile tab bar's centre button navigates here and raises this flag.
  // Deriving the wizard's openness from it, rather than copying it into local
  // state in an effect, means there is one source of truth and no render where
  // the two disagree.
  const requested = useAppSelector((state) => state.ui.newOrderRequested);
  const wizardOpen = locallyOpen || requested;

  const closeWizard = () => {
    setLocallyOpen(false);
    if (requested) dispatch(clearNewOrderRequest());
  };

  const { pageItems, startIndex, canPrev, canNext, step } =
    usePagination(filtered);

  // Registry-wide, not filter-scoped: these answer "what is outstanding across
  // the till", which a search for one customer should not change.
  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.paymentType === PaymentType.Paid);
    const credit = orders.filter((o) => o.paymentType === PaymentType.OnCredit);
    const sum = (rows: Order[]) => rows.reduce((n, o) => n + o.total, 0);
    return {
      count: orders.length,
      revenue: sum(orders),
      paidCount: paid.length,
      paidTotal: sum(paid),
      creditCount: credit.length,
      creditTotal: sum(credit),
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customer Order Registry"
        subtitle="Issue POS bills & assign couriers"
      />

      {isError ? null : isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Orders"
            value={stats.count}
            icon={LuShoppingBag}
            tone="accent"
            caption="All transactions"
          />
          <StatCard
            label="Revenue"
            value={formatCurrency(stats.revenue)}
            icon={LuBanknote}
            tone="success"
            caption="Across the registry"
          />
          <StatCard
            label="Paid"
            value={stats.paidCount}
            icon={LuReceiptText}
            tone="success"
            caption={`${formatCurrency(stats.paidTotal)} settled`}
          />
          <StatCard
            label="On Credit"
            value={stats.creditCount}
            icon={LuClock}
            tone="danger"
            caption={`${formatCurrency(stats.creditTotal)} outstanding`}
          />
        </div>
      )}

      <Toolbar
        actions={
          <>
            <ViewToggle
              value={viewMode}
              onChange={(mode) =>
                dispatch(setViewMode({ key: "orders", mode }))
              }
            />
            <Button
              icon={LuCirclePlus}
              block
              onClick={() => setLocallyOpen(true)}
            >
              Create Order
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          clearable
          placeholder="Search txn, customer, phone, address..."
          className="w-full sm:max-w-xs"
        />
        <Select
          aria-label="Filter by payment status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "" | PaymentType)
          }
          placeholder="All Statuses"
          options={[
            { value: PaymentType.Paid, label: "Paid" },
            { value: PaymentType.OnCredit, label: "On Credit" },
          ]}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      {isError ? (
        <ErrorState
          title="Couldn't load transactions"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <RegistrySkeleton
          viewMode={viewMode}
          label="Loading transactions"
          columns={7}
        />
      ) : orders.length === 0 ? (
        <EmptyState message="No transactions recorded" icon={LuReceiptText} />
      ) : filtered.length === 0 ? (
        // Distinct from "none recorded" — the registry has rows, this filter
        // just doesn't match any, and the fix is to change the filter.
        <EmptyState
          message="No transactions match this search"
          icon={LuSearchX}
        />
      ) : viewMode === ViewMode.Grid ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((order) => (
            <Card key={order.id} interactive padded={false}>
              <div className="p-[18px] pb-3.5">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <span className="text-foreground-strong font-mono text-xs font-bold">
                    {order.id}
                  </span>
                  <Badge pill tone={paymentTone(order.paymentType)}>
                    {order.paymentType}
                  </Badge>
                </div>

                <p className="text-foreground-strong truncate text-[15px] font-bold">
                  {order.customer.name}
                </p>
                <p className="text-foreground-muted mt-0.5 truncate text-[12.5px]">
                  {order.customer.phone}
                </p>
                <p className="text-foreground-subtle mt-0.5 truncate text-[12.5px]">
                  Courier: {order.courier}
                </p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-foreground-strong font-display text-xl font-bold">
                    {formatCurrency(order.total)}
                  </span>
                  <span className="text-foreground-subtle text-xs">
                    {totalUnits(order)} items
                  </span>
                </div>
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
          ))}
        </div>
      ) : (
        <Table
          minWidth="550px"
          headers={[
            { label: "Txn ID" },
            { label: "Customer" },
            { label: "Courier" },
            { label: "Qty" },
            { label: "Status" },
            { label: "Total" },
            { label: "Receipt", align: "right" },
          ]}
        >
          {pageItems.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="text-foreground font-mono font-bold whitespace-nowrap">
                {order.id}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="text-foreground font-bold">
                  {order.customer.name}
                </div>
                <div className="text-nano text-foreground-subtle">
                  {order.customer.phone}
                </div>
              </TableCell>
              <TableCell className="text-foreground-body whitespace-nowrap">
                {order.courier}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {totalUnits(order)} pcs
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge pill tone={paymentTone(order.paymentType)}>
                  {order.paymentType}
                </Badge>
              </TableCell>
              <TableCell className="text-foreground-strong font-extrabold whitespace-nowrap">
                {formatCurrency(order.total)}
              </TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setReceipt(order)}
                  className="text-accent-text border-border hover:bg-accent-soft rounded-control-sm text-label inline-flex items-center gap-1 border px-2.5 py-1 font-bold transition-colors"
                >
                  <LuPrinter className="h-3.5 w-3.5" aria-hidden />
                  Receipt
                </button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      {/* Hidden while loading: the skeleton renders its own pagination bar, and
          both at once stacks two identical strips with a "Showing 0-0 of 0". */}
      {isLoading || isError ? null : (
        <Pagination
          startIndex={startIndex}
          pageItemCount={pageItems.length}
          total={filtered.length}
          canPrev={canPrev}
          canNext={canNext}
          onStep={step}
        />
      )}

      {wizardOpen ? (
        <OrderWizard onClose={closeWizard} onIssued={setReceipt} />
      ) : null}

      {receipt ? (
        <InvoiceModal order={receipt} onClose={() => setReceipt(undefined)} />
      ) : null}
    </div>
  );
}
