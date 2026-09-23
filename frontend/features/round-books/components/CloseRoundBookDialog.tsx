"use client";

import { useState } from "react";
import { LuCircleCheck, LuTriangleAlert } from "react-icons/lu";
import type { CloseRoundBookResult, RoundBook } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { Modal } from "@components/ui/modals";
import { formatCurrency, formatDeliveryDate } from "@utils/helper/format";
import {
  useCloseRoundBookMutation,
  useGetRoundBookQuery,
} from "../api/roundBooksApi";

interface CloseRoundBookDialogProps {
  /** The open book as the bar last showed it — refreshed on mount below. */
  book: RoundBook;
  /** Customers paused on the round list. They get no bill next week. */
  pausedIds: ReadonlySet<string>;
  /** Customers resumed after a pause, whose last bill will be repeated. */
  returning: number;
  onClose: () => void;
}

/**
 * mymilkman's closure dialog, nearly word for word: a warning, a short
 * checklist, and Yes / Cancel. Who is billed next week is already decided on
 * the list by the pause buttons, so the dialog asks nothing else.
 *
 * Unlike mymilkman, it also says in one line what closing is about to do —
 * how many bills it will raise — so the owner is not pressing a button
 * without knowing the outcome. The server's checklist (unpaid money, orders
 * with no driver) appears only when there is something on it.
 *
 * While the close is in flight the dialog cannot be dismissed: the request
 * would still land, and a vanished dialog would hide the outcome.
 */
export function CloseRoundBookDialog({
  book: initial,
  pausedIds,
  returning,
  onClose,
}: CloseRoundBookDialogProps) {
  const fresh = useGetRoundBookQuery(initial.id, {
    refetchOnMountOrArgChange: true,
  });
  const book = fresh.data ?? initial;
  const customers = book.statements ?? [];
  const billed = customers.filter((c) => !pausedIds.has(c.customerId));
  const paused = customers.length - billed.length;
  const willBill = billed.length + returning;

  const [closeBook, { isLoading, error }] = useCloseRoundBookMutation();
  // One key for the life of the dialog, so a retried press replays rather than
  // raising every customer's next bill a second time.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<CloseRoundBookResult | undefined>();

  const dismiss = () => {
    if (!isLoading) onClose();
  };

  const confirm = async () => {
    const response = await closeBook({
      code: book.id,
      idempotencyKey,
      // The pause flag is read on the server; nothing to exclude by hand.
      excludeCustomerIds: [],
    });
    if ("data" in response && response.data) setResult(response.data);
  };

  if (result) {
    const { created, skipped } = result.rolledForward;
    const due = created.reduce((sum, bill) => sum + bill.grandTotal, 0);

    return (
      <Modal
        onClose={onClose}
        title="Round Book Closed"
        size="md"
        footer={
          <div className="flex flex-1 justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 text-xs">
          <LuCircleCheck className="text-success mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="text-foreground-body space-y-2">
            <p className="text-foreground-strong text-sm font-bold">
              {result.closed.roundLabel} is closed.
            </p>
            <p>
              <strong className="text-foreground-strong">
                {created.length} bill{created.length === 1 ? "" : "s"}
              </strong>{" "}
              created for the week starting{" "}
              {formatDeliveryDate(result.next.weekStart)}, with any unpaid
              amount added. Total to collect:{" "}
              <strong className="text-foreground-strong">{formatCurrency(due)}</strong>.
            </p>
            {skipped.length > 0 ? (
              <p className="text-foreground-muted">
                No bill for:{" "}
                {skipped.map((s) => `${s.name} (${s.reason.replace(/\.$/, "").toLowerCase()})`).join(", ")}
                .
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    );
  }

  const warnings = book.warnings ?? [];

  return (
    <Modal
      onClose={dismiss}
      title="Close Round Book"
      size="md"
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button
            onClick={() => void confirm()}
            disabled={fresh.isFetching}
            loading={isLoading}
            loadingLabel="Closing..."
          >
            Yes, Close Round Book
          </Button>
          <Button variant="danger" onClick={dismiss} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3">
          <LuTriangleAlert className="text-warning mt-0.5 h-6 w-6 shrink-0" aria-hidden />
          <p className="text-foreground-strong text-sm font-bold">
            Are you sure you wish to close your Round Book?
          </p>
        </div>

        <div className="text-foreground-body space-y-1">
          <p className="font-semibold">Before you close your round book:</p>
          <ol className="list-decimal space-y-0.5 pl-5">
            <li>Ensure you have reviewed all orders</li>
            <li>Ensure you have recorded all cash payments</li>
            <li>Pause any customer who should not get a bill next week</li>
          </ol>
        </div>

        {warnings.length > 0 ? (
          <ul className="bg-warning-soft border-warning-ring text-warning-text rounded-control list-disc space-y-1 border py-2.5 pr-3 pl-7 font-semibold">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        ) : null}

        <p className="bg-surface-subtle rounded-control text-foreground-body px-3.5 py-3">
          <strong className="text-foreground-strong">
            {willBill} customer{willBill === 1 ? "" : "s"}
          </strong>{" "}
          will get a bill for next week
          {paused > 0 ? ` (${paused} paused)` : ""}. Any unpaid amount is added
          to their new bill.
        </p>

        <p className="text-foreground-muted">
          <strong className="text-foreground-strong">Note:</strong> Closing a
          round book creates next week&apos;s bills for your customers. You
          cannot re-open a round book.
        </p>

        {error ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger-text border-danger-ring rounded-control border px-3 py-2 font-semibold"
          >
            {String(error)}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
