"use client";

import { LuBanknote, LuCircleCheck } from "react-icons/lu";
import { useState } from "react";
import type { Order } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import { ErrorState, Skeleton } from "@components/ui/states";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";
import { reportError } from "@utils/libs/reportError";
import { useGetOutstandingQuery } from "@features/orders/api/ordersApi";
import { useRecordPaymentMutation } from "../api/paymentsApi";

interface RecordPaymentModalProps {
  /** The delivery the money is being handed over at. */
  order: Order;
  /** Whoever is taking it — the courier at the door, or the admin at the till. */
  receivedBy: string;
  onClose: () => void;
}

/**
 * Records what the customer actually handed over at a delivery.
 *
 * Deliberately not a Paid/Unpaid switch. On a round the three real answers are
 * "all of it", "just last week's", and "nothing today" — and often a figure that
 * is none of those. The quick buttons cover the common three and the field takes
 * anything else, because a customer who gives £20 against £34.49 has to be
 * recordable or the balance stops matching the cash box.
 *
 * The balance is read live rather than taken from the order: `previousBalance` on
 * a bill is a snapshot from the day it was raised, and money may have come in
 * since.
 */
export function RecordPaymentModal({
  order,
  receivedBy,
  onClose,
}: RecordPaymentModalProps) {
  const { data, isLoading, isError, refetch } = useGetOutstandingQuery(
    order.customerId,
  );
  const [recordPayment, { isLoading: saving }] = useRecordPaymentMutation();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | undefined>();

  const balance = data?.total ?? 0;
  /** What is left on this delivery's own goods. */
  const thisDelivery = Math.max(0, order.total - order.settledAmount);
  /** Everything older that is still open. */
  const earlier = Math.max(0, Math.round((balance - thisDelivery) * 100) / 100);

  const entered = Number(amount);
  const valid = Number.isFinite(entered) && entered > 0;
  const carried = valid ? Math.max(0, balance - entered) : balance;

  const submit = async () => {
    if (!valid) {
      setError("Enter how much was received.");
      return;
    }
    // Capped at the balance: a milk round collects debts, it does not take
    // deposits, and an overpayment would leave a negative balance that every
    // figure downstream would then have to explain.
    if (entered > balance) {
      setError(
        `That is more than the ${formatCurrency(balance)} outstanding. Enter that or less.`,
      );
      return;
    }

    setError(undefined);
    try {
      await recordPayment({
        customerId: order.customerId,
        orderId: order.id,
        amount: entered,
        receivedBy,
      }).unwrap();
      onClose();
    } catch (cause) {
      reportError(cause, "recordPayment");
      setError("Could not record this payment. Please try again.");
    }
  };

  const quick = [
    { label: "Full", value: balance },
    // Only when there is an older debt distinct from today's goods — otherwise
    // it would be a second button for the same number.
    ...(earlier > 0 && earlier < balance
      ? [{ label: "Previous only", value: earlier }]
      : []),
  ].filter((option) => option.value > 0);

  return (
    <Modal
      onClose={onClose}
      title="Record Payment"
      size="md"
      footer={
        // Column-reverse on a phone: the two labels are too long to share a row
        // at 360px, and wrapping them right-aligned left the primary action
        // floating in the middle of nowhere.
        <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* "Nothing collected" is the honest way out: no payment is recorded,
              and the whole balance stays on the round for next delivery. */}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Nothing collected
          </Button>
          <Button
            icon={LuBanknote}
            onClick={() => void submit()}
            loading={saving}
            loadingLabel="Recording..."
            disabled={balance <= 0}
            className="w-full sm:w-auto"
          >
            Record payment
          </Button>
        </div>
      }
    >
      {isError ? (
        <ErrorState
          inset
          title="Couldn't load the balance"
          detail="Nothing has been recorded."
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : balance <= 0 ? (
        <div className="border-success-ring bg-success-soft rounded-control flex items-center gap-2.5 border p-3">
          <LuCircleCheck
            className="text-success-text h-4 w-4 shrink-0"
            aria-hidden
          />
          <p className="text-success-text text-xs font-bold">
            {order.customer.name} owes nothing — account is clear.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-foreground-body text-xs font-extrabold">
              {order.customer.name}
            </p>
            <p className="text-micro text-foreground-subtle">
              Collected at {order.id} &middot; taken by {receivedBy}
            </p>
          </div>

          {quick.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quick.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setAmount(option.value.toFixed(2));
                    setError(undefined);
                  }}
                  className={cn(
                    "rounded-control press-scale border px-3 py-2 text-xs font-bold transition-colors",
                    Number(amount) === option.value
                      ? "border-accent-ring bg-accent-soft text-accent-text"
                      : "border-border text-foreground-body hover:bg-surface-muted",
                  )}
                >
                  {option.label} {formatCurrency(option.value)}
                </button>
              ))}
            </div>
          ) : null}

          <FormField label="Amount received" htmlFor="pay-amount" required>
            <input
              id="pay-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              max={balance}
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(undefined);
              }}
              placeholder="0.00"
              className={inputClass()}
            />
          </FormField>

          {/* The same four lines the docket prints, updating as it is typed —
              so the driver can read the carry-forward back to the customer
              before anything is committed. */}
          <dl className="bg-surface-muted rounded-control text-micro space-y-1 p-3">
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">This delivery</dt>
              <dd className="font-bold">{formatCurrency(thisDelivery)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Earlier bills</dt>
              <dd className="font-bold">
                {earlier > 0 ? formatCurrency(earlier) : "Nil"}
              </dd>
            </div>
            <div className="border-border flex justify-between gap-2 border-t pt-1">
              <dt className="text-foreground-body font-bold">Total due</dt>
              <dd className="font-bold">{formatCurrency(balance)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground-muted">Received now</dt>
              <dd className="text-accent-text font-bold">
                {valid ? formatCurrency(entered) : formatCurrency(0)}
              </dd>
            </div>
            <div className="border-border flex justify-between gap-2 border-t pt-1">
              <dt className="text-foreground-body font-bold">
                Carried forward
              </dt>
              <dd
                className={cn(
                  "font-bold",
                  carried > 0 ? "text-warning-text" : "text-success-text",
                )}
              >
                {carried > 0 ? formatCurrency(carried) : "Nil"}
              </dd>
            </div>
          </dl>

          {error ? (
            <p
              role="alert"
              className="bg-danger-soft text-danger-text border-danger-ring rounded-control border px-3 py-2 text-xs font-semibold"
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
