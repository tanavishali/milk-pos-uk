"use client";

import { LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import { ErrorState, Skeleton } from "@components/ui/states";
import { PaymentStatus } from "@enums/index";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";
import { useGetOutstandingQuery } from "../api/ordersApi";
import type { OrderWizardController } from "../hooks/useOrderWizard";

/** A two-state control. Used for both decisions on this step. */
function Choice({
  name,
  value,
  onChange,
  yes,
  no,
}: {
  name: string;
  value: boolean;
  onChange: (next: boolean) => void;
  yes: string;
  no: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: yes, on: true },
        { label: no, on: false },
      ].map((option) => {
        const checked = value === option.on;
        return (
          <label
            key={option.label}
            className={cn(
              "rounded-control flex cursor-pointer items-center gap-2 border p-2.5 transition-colors",
              checked
                ? option.on
                  ? "border-accent bg-accent-soft"
                  : "border-warning-ring bg-warning-soft"
                : "border-border hover:bg-surface-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option.on)}
              className={option.on ? "accent-accent" : "accent-warning"}
            />
            <span
              className={cn(
                "text-xs font-bold",
                checked && !option.on
                  ? "text-warning-text"
                  : "text-foreground-body",
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Step 4: what is being collected against this bill, right now.
 *
 * Two separate decisions, because on a round they genuinely are two. A customer
 * can settle this week and leave last week's, settle last week's and leave this
 * week's, do both, or do neither — all four happen, and one Paid/Unpaid switch
 * covering both figures could only ever record two of them.
 *
 * Nothing here folds the old balance into the new bill. It stays on the bill it
 * came from and is simply shown alongside; folding would put the same money on
 * two bills and double the debt every time it rolled forward.
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
  const dueAtDoor = wizard.total + previous;

  // Only what is actually being taken now. An unticked previous balance is not
  // money — it goes back on the round for next week.
  const receiving =
    (wizard.billPaid ? wizard.total : 0) +
    (hasPrevious && wizard.clearPrevious ? previous : 0);
  const carried = dueAtDoor - receiving;

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-foreground-body text-xs font-extrabold">
          Step 4: Bill &amp; Payment
        </h4>
        <p className="text-micro text-foreground-subtle">
          What {wizard.customer?.name ?? "this customer"} is paying now. The
          rest rolls to the next delivery.
        </p>
      </div>

      {isError ? (
        <ErrorState
          inset
          title="Couldn't check the previous balance"
          detail="Generate the bill without it, or retry."
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
                Previous bill: {formatCurrency(previous)} across{" "}
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
                      {order.status === PaymentStatus.Partial
                        ? ` · part paid ${formatCurrency(order.settledAmount)}`
                        : ""}
                    </span>
                    <span className="shrink-0 font-bold">
                      {formatCurrency(order.total - order.settledAmount)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="border-warning-ring mt-2.5 border-t pt-2.5">
                <p className="text-warning-text text-micro mb-1.5 font-bold">
                  Is the previous bill being cleared now?
                </p>
                <Choice
                  name="clearPrevious"
                  value={wizard.clearPrevious}
                  onChange={wizard.setClearPrevious}
                  yes={`Cleared ${formatCurrency(previous)}`}
                  no="Still pending"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="text-micro text-foreground-body mb-1.5 font-bold">
          This bill — {formatCurrency(wizard.total)}
        </p>
        <Choice
          name="billPaid"
          value={wizard.billPaid}
          onChange={wizard.setBillPaid}
          yes="Paid"
          no="Unpaid"
        />
        {!wizard.billPaid ? (
          <p className="text-warning-text text-nano mt-1 font-semibold">
            Carries to the next delivery as the previous bill.
          </p>
        ) : null}
      </div>

      <dl className="bg-surface-muted border-border rounded-control space-y-1 border p-3 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">This bill:</dt>
          <dd className="text-foreground font-bold">
            {formatCurrency(wizard.total)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">Previous bill:</dt>
          <dd
            className={cn(
              "font-bold",
              hasPrevious ? "text-warning-text" : "text-foreground-subtle",
            )}
          >
            {hasPrevious ? formatCurrency(previous) : "Nil"}
          </dd>
        </div>
        <div className="border-border flex justify-between gap-2 border-t pt-1">
          <dt className="text-foreground-body font-bold">Total due:</dt>
          <dd className="text-foreground font-bold">
            {formatCurrency(dueAtDoor)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">Paying now:</dt>
          <dd className="text-accent-text font-bold">
            {receiving > 0 ? formatCurrency(receiving) : "Nil"}
          </dd>
        </div>
        {/* The number that decides next week's bill. */}
        <div className="border-border flex items-baseline justify-between gap-2 border-t pt-1">
          <dt className="text-foreground-body font-bold">Carries forward:</dt>
          <dd
            className={cn(
              "font-display text-base font-extrabold",
              carried > 0 ? "text-warning-text" : "text-success-text",
            )}
          >
            {carried > 0 ? formatCurrency(carried) : "Nil"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
