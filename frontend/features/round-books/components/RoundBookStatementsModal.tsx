"use client";

import { LuPrinter } from "react-icons/lu";
import { Badge } from "@components/ui/data-display";
import { Modal } from "@components/ui/modals";
import { EmptyState, ErrorState, Skeleton } from "@components/ui/states";
import { RoundBookStatus } from "@enums/index";
import { formatCurrency, formatDeliveryDate } from "@utils/helper/format";
import { useGetRoundBookQuery } from "../api/roundBooksApi";

interface RoundBookStatementsModalProps {
  bookId: string;
  onClose: () => void;
}

/**
 * One line per customer on a book.
 *
 * For a closed book these are the frozen statements — the figures as they
 * stood when it closed, whatever has been paid since. For the open book they
 * are live, which is what makes this the place to look before closing.
 */
export function RoundBookStatementsModal({
  bookId,
  onClose,
}: RoundBookStatementsModalProps) {
  const { data: book, isLoading, isError, refetch } =
    useGetRoundBookQuery(bookId);

  const title = book
    ? `[${book.id}] ${book.roundLabel} statements`
    : "Round book statements";

  return (
    <Modal
      onClose={onClose}
      title={title}
      size="lg"
      printable
      headerActions={
        book ? (
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print statements"
            className="text-foreground-subtle hover:text-foreground-body rounded-control-sm p-1 transition-colors"
          >
            <LuPrinter className="h-[18px] w-[18px]" aria-hidden />
          </button>
        ) : null
      }
    >
      {isLoading ? (
        <Skeleton className="rounded-control h-48 w-full" />
      ) : isError || !book ? (
        <ErrorState title="Couldn't load statements" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-foreground-muted">
              Week of {formatDeliveryDate(book.weekStart)} to{" "}
              {formatDeliveryDate(book.weekEnd)}
            </p>
            <Badge
              pill
              tone={book.status === RoundBookStatus.Open ? "success" : "neutral"}
            >
              {book.status === RoundBookStatus.Open
                ? "Open, figures are live"
                : "Closed, figures are frozen"}
            </Badge>
          </div>

          {(book.statements ?? []).length === 0 ? (
            <EmptyState message="No customers were billed in this book" />
          ) : (
            <div className="border-border overflow-x-auto rounded-control border">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-surface-muted text-foreground-body border-border border-b font-bold">
                  <tr>
                    <th scope="col" className="px-3 py-2">Customer</th>
                    <th scope="col" className="px-3 py-2 text-right">Orders</th>
                    <th scope="col" className="px-3 py-2 text-right">Billed</th>
                    <th scope="col" className="px-3 py-2 text-right">Paid</th>
                    <th scope="col" className="px-3 py-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-border-subtle divide-y">
                  {book.statements!.map((line) => (
                    <tr key={line.customerId}>
                      <td className="px-3 py-2">
                        <span className="text-foreground-strong font-bold">
                          {line.name}
                        </span>{" "}
                        <span className="text-foreground-subtle font-mono">
                          [{line.customerId}]
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{line.orderCount}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(line.billed)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(line.settled)}
                      </td>
                      <td
                        className={
                          line.balance > 0
                            ? "text-warning-text px-3 py-2 text-right font-bold"
                            : "text-foreground-strong px-3 py-2 text-right font-bold"
                        }
                      >
                        {formatCurrency(line.balance)}
                        {line.balance < 0 ? " credit" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-border bg-surface-subtle border-t font-bold">
                  <tr>
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right">{book.summary.orderCount}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(book.summary.billed)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(book.summary.settled)}
                    </td>
                    <td className="text-warning-text px-3 py-2 text-right">
                      {formatCurrency(book.summary.carriedForward)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <p className="text-foreground-subtle">
            Balance is the customer&apos;s whole account, including anything
            still owed from earlier weeks.
          </p>
        </div>
      )}
    </Modal>
  );
}
