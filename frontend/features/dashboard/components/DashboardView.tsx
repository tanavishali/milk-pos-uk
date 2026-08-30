"use client";

import {
  LuBanknote,
  LuDollarSign,
  LuPackageX,
  LuSmile,
  LuTriangleAlert,
  LuUsers,
} from "react-icons/lu";
import { LOW_STOCK_THRESHOLD } from "@app-types/index";
import { PageHeader, StatCard } from "@components/ui/cards";
import { Badge, Table, TableCell, TableRow } from "@components/ui/data-display";
import {
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonPanel,
  SkeletonScreen,
  SkeletonStatCards,
} from "@components/ui/states";
import { PaymentStatus } from "@enums/index";
import { useGetDeliveryRoundsQuery } from "@features/customers/api/deliveryApi";
import { formatCurrency } from "@utils/helper/format";
import { useGetDashboardOverviewQuery } from "../api/dashboardApi";

/** How many rows each panel shows before it stops being a summary. */
const PANEL_ROWS = 6;

export function DashboardView() {
  const { data, isLoading, isError, refetch } =
    useGetDashboardOverviewQuery(PANEL_ROWS);

  // Static reference data, cached for an hour and shared with the customers
  // screen — the overview returns round ids, not the words for them.
  const { data: rounds = [] } = useGetDeliveryRoundsQuery();

  const roundLabel = (id: string) =>
    rounds.find((round) => round.id === id)?.label ?? "No round";

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load the dashboard"
        onRetry={() => void refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <SkeletonScreen label="Loading dashboard">
        <div className="space-y-4">
          <Skeleton className="rounded-control h-9 w-56" />
          <SkeletonStatCards />
          <SkeletonPanel lines={6} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <SkeletonPanel lines={5} />
            <SkeletonPanel lines={5} />
          </div>
        </div>
      </SkeletonScreen>
    );
  }

  const { metrics, debtors, openBills, lowStock } = data;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        subtitle="Money owed, open bills and stock on hand"
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Billed"
          value={formatCurrency(metrics.grossProfit)}
          icon={LuDollarSign}
          caption={`${metrics.totalOrders} bills raised`}
        />
        <StatCard
          label="Collected"
          value={formatCurrency(metrics.collected)}
          icon={LuBanknote}
          tone="success"
          caption="Cash received"
        />
        {/* Billed less collected: on a credit round this is the number that
            matters, and the old model could not produce it. */}
        <StatCard
          label="Outstanding"
          value={formatCurrency(metrics.outstanding)}
          icon={LuTriangleAlert}
          tone={metrics.outstanding > 0 ? "danger" : "success"}
          caption={`${openBills.total} bill${openBills.total === 1 ? "" : "s"} still open`}
        />
        <StatCard
          label="Customers Owing"
          value={debtors.total}
          icon={LuUsers}
          tone={debtors.total > 0 ? "danger" : "success"}
          caption={`of ${metrics.totalCustomers} on the directory`}
        />
      </div>

      <section className="space-y-2">
        <h3 className="text-foreground-strong text-xs font-extrabold">
          Money owed
        </h3>
        {debtors.rows.length === 0 ? (
          <EmptyState message="Every account is clear." icon={LuSmile} />
        ) : (
          <Table
            headers={[
              { label: "Customer" },
              { label: "Round" },
              { label: "Open Bills", align: "center" },
              { label: "Balance", align: "right" },
            ]}
          >
            {debtors.rows.map((row) => (
              <TableRow key={row.customerId}>
                <TableCell className="text-foreground font-bold">
                  {row.name}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge>{roundLabel(row.round)}</Badge>
                </TableCell>
                <TableCell align="center" className="font-semibold">
                  {row.openBills}
                </TableCell>
                <TableCell
                  align="right"
                  className="text-danger font-extrabold whitespace-nowrap"
                >
                  {formatCurrency(row.balance)}
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
        {debtors.total > debtors.rows.length ? (
          <p className="text-foreground-subtle text-micro">
            Showing the {debtors.rows.length} largest of {debtors.total}.
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="space-y-2">
          <h3 className="text-foreground-strong text-xs font-extrabold">
            Bills still open
          </h3>
          {openBills.rows.length === 0 ? (
            <EmptyState message="Nothing outstanding." icon={LuSmile} />
          ) : (
            <Table
              minWidth="360px"
              headers={[
                { label: "Txn" },
                { label: "Customer" },
                { label: "Status" },
                { label: "Due", align: "right" },
              ]}
            >
              {openBills.rows.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="text-foreground font-bold whitespace-nowrap">
                    {bill.id}
                  </TableCell>
                  <TableCell className="truncate">
                    {bill.customerName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge
                      tone={
                        bill.status === PaymentStatus.Partial
                          ? "info"
                          : "warning"
                      }
                    >
                      {bill.status}
                    </Badge>
                  </TableCell>
                  {/* What is left on this bill, not the door total: the
                      previous balance is another bill's debt. */}
                  <TableCell
                    align="right"
                    className="text-foreground-strong font-bold whitespace-nowrap"
                  >
                    {formatCurrency(bill.remaining)}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-foreground-strong text-xs font-extrabold">
            Low stock
          </h3>
          {lowStock.rows.length === 0 ? (
            <EmptyState
              message={`Nothing below ${LOW_STOCK_THRESHOLD} units.`}
              icon={LuPackageX}
            />
          ) : (
            <Table
              minWidth="360px"
              headers={[
                { label: "Item" },
                { label: "Category" },
                { label: "On Hand", align: "right" },
              ]}
            >
              {lowStock.rows.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="text-foreground font-bold">
                    {product.name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge tone="accent">{product.category}</Badge>
                  </TableCell>
                  <TableCell
                    align="right"
                    className="text-danger font-extrabold whitespace-nowrap"
                  >
                    {product.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
