"use client";

import { LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { ErrorState, Skeleton } from "@components/ui/states";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";
import { useGetOutstandingQuery } from "../api/ordersApi";
import type { OrderWizardController } from "../hooks/useOrderWizard";

/**
 * Step 4: the balance carried in from earlier unpaid bills.
 *
 * The amount is read from the server, not computed here — the till must not be
 * the thing that decides what a customer owes. Including it also *settles* those
 * earlier orders when the sale is issued, so the same debt is never billed
 * twice; that is why this is a deliberate choice rather than a silent addition.
 */
export function WizardBalanceStep({
  wizard,
}: {
  wizard: OrderWizardController;
}) {
  const customerId = wizard.customer?.id ?? "";
  const { data, isLoading, isError, refetch } = useGetOutstandingQuery(
    customerId,
    { skip: !customerId },
  );

  const previous = data?.total ?? 0;
  const hasPrevious = previous > 0;
  const carried = wizard.includePrevious ? previous : 0;
  const dueNow = wizard.total + carried;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-foreground-body text-xs font-extrabold">
          Step 4: Previous Balance
        </h4>
        <p className="text-micro text-foreground-subtle">
          Unpaid bills for {wizard.customer?.name ?? "this customer"}.
        </p>
      </div>

      {isError ? (
        <ErrorState
          inset
          title="Couldn't check the previous balance"
          detail="Issue the order without it, or retry."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="border-border rounded-control space-y-2 border p-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-6 w-28" />
        </div>
      ) : !hasPrevious ? (
        // The nil case is stated outright. An empty panel would leave the
        // cashier wondering whether the check actually ran.
        <div className="border-success-ring bg-success-soft rounded-control flex items-center gap-2.5 border p-3">
          <LuCircleCheck
            className="text-success-text h-4 w-4 shrink-0"
            aria-hidden
          />
          <p className="text-success-text text-xs font-bold">
            Previous bill is nil — nothing outstanding.
          </p>
        </div>
      ) : (
        <div className="border-warning-ring bg-warning-soft rounded-control border p-3">
          <div className="flex items-start gap-2.5">
            <LuTriangleAlert
              className="text-warning-text mt-0.5 h-4 w-4 shrink-0"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-warning-text text-xs font-bold">
                {formatCurrency(previous)} outstanding across{" "}
                {data?.orders.length}{" "}
                {data?.orders.length === 1 ? "bill" : "bills"}
              </p>

              <ul className="mt-2 space-y-1">
                {data?.orders.map((order) => (
                  <li
                    key={order.id}
                    className="text-warning-text/90 text-micro flex justify-between gap-2"
                  >
                    <span className="truncate font-mono">
                      {order.id} &middot; {order.date}
                    </span>
                    <span className="shrink-0 font-bold">
                      {formatCurrency(order.grandTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <label className="border-warning-ring mt-2.5 flex cursor-pointer items-center gap-2 border-t pt-2.5">
                <input
                  type="checkbox"
                  checked={wizard.includePrevious}
                  onChange={(event) =>
                    wizard.setIncludePrevious(event.target.checked)
                  }
                  className="accent-warning"
                />
                <span className="text-warning-text text-xs font-bold">
                  Add to this bill
                </span>
              </label>
              {!wizard.includePrevious ? (
                <p className="text-warning-text/80 text-nano mt-1">
                  Left off — it stays outstanding on the earlier bills.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* The arithmetic, spelled out, so what prints holds no surprises. */}
      <dl className="bg-surface-muted border-border rounded-control space-y-1 border p-3 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">This bill:</dt>
          <dd className="text-foreground font-bold">
            {formatCurrency(wizard.total)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">Previous balance:</dt>
          <dd
            className={cn(
              "font-bold",
              carried > 0 ? "text-warning-text" : "text-foreground-subtle",
            )}
          >
            {carried > 0 ? formatCurrency(carried) : "Nil"}
          </dd>
        </div>
        <div className="border-border flex justify-between gap-2 border-t pt-1.5">
          <dt className="text-foreground-strong font-bold">Total due:</dt>
          <dd className="text-accent-text font-display text-base font-bold">
            {formatCurrency(dueNow)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
