"use client";

import { LuBookCheck, LuFileText } from "react-icons/lu";
import type { RoundBook } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { Select } from "@components/ui/fields";
import { Badge } from "@components/ui/data-display";
import { Skeleton } from "@components/ui/states";
import { RoundBookStatus } from "@enums/index";
import { formatDeliveryDate } from "@utils/helper/format";
import {
  useGetCurrentRoundBookQuery,
  useGetRoundBooksQuery,
} from "../api/roundBooksApi";

/** `""` is the round's open book, `"all"` is every book, anything else a code. */
export type BookSelection = string;
export const CURRENT_BOOK = "";
export const ALL_BOOKS = "all";

interface RoundBookBarProps {
  roundId: string;
  selection: BookSelection;
  onSelect: (selection: BookSelection) => void;
  onClose: (book: RoundBook) => void;
  onStatements: (bookId: string) => void;
}

/**
 * The selected round's book, laid out the way mymilkman's Customer List
 * heads it: `[Roundbook 160567] Week start: Mon, 21 Sep 2026`, with Close
 * Round Book on the right.
 *
 * Shown only when a round is picked. Closing is per round — each round has
 * its own week — so the bar never appears for "No round" or all rounds.
 */
export function RoundBookBar({
  roundId,
  selection,
  onSelect,
  onClose,
  onStatements,
}: RoundBookBarProps) {
  const current = useGetCurrentRoundBookQuery(roundId);
  const history = useGetRoundBooksQuery(roundId);

  if (current.isLoading) {
    return <Skeleton className="rounded-card h-[68px] w-full" />;
  }

  if (current.isError || !current.data) {
    return (
      <div
        role="alert"
        className="bg-danger-soft text-danger-text border-danger-ring rounded-card flex items-center justify-between gap-3 border px-4 py-3 text-xs font-semibold"
      >
        Couldn&apos;t load this round&apos;s book.
        <Button size="sm" variant="secondary" onClick={() => void current.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const books = history.data ?? [current.data];
  const closedBooks = books.filter((book) => book.status === RoundBookStatus.Closed);
  const shown =
    selection === CURRENT_BOOK || selection === ALL_BOOKS
      ? current.data
      : (books.find((book) => book.id === selection) ?? current.data);
  const isOpen = shown.status === RoundBookStatus.Open;

  return (
    <section
      aria-label={`${shown.roundLabel} round book`}
      className="bg-surface border-border rounded-card flex flex-col gap-3 border px-4 py-3 shadow-card sm:px-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0">
        <p className="text-foreground-strong flex flex-wrap items-center gap-2 text-[15px] font-bold">
          <span>
            [Roundbook {shown.id}] Week start:{" "}
            {formatDeliveryDate(shown.weekStart)}
          </span>
          {isOpen ? null : (
            <Badge pill tone="neutral">
              Closed
            </Badge>
          )}
        </p>
        <p className="text-foreground-muted mt-0.5 text-xs">
          {shown.roundLabel}
          {!isOpen && shown.closedAt
            ? ` · closed ${new Date(shown.closedAt).toLocaleDateString("en-IE")}`
            : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {closedBooks.length > 0 ? (
          <Select
            aria-label="Choose a week"
            value={selection}
            onChange={(event) => onSelect(event.target.value)}
            options={[
              { value: CURRENT_BOOK, label: "This week" },
              ...closedBooks.map((book) => ({
                value: book.id,
                label: `Week of ${formatDeliveryDate(book.weekStart)}`,
              })),
              { value: ALL_BOOKS, label: "All weeks" },
            ]}
            className="w-full sm:w-auto"
          />
        ) : null}
        <Button
          variant="secondary"
          icon={LuFileText}
          onClick={() => onStatements(shown.id)}
        >
          Statements
        </Button>
        {isOpen ? (
          <Button icon={LuBookCheck} onClick={() => onClose(shown)}>
            Close Round Book
          </Button>
        ) : null}
      </div>
    </section>
  );
}
