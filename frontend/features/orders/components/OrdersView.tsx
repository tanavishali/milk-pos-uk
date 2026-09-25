"use client";

import {
  LuBanknote,
  LuCirclePlus,
  LuClock,
  LuEye,
  LuBookCheck,
  LuHandCoins,
  LuPause,
  LuPlay,
  LuReceiptText,
  LuSearchX,
  LuShoppingBag,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Order, RoundBook } from "@app-types/index";
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
import { PaymentStatus, ViewMode } from "@enums/index";
import { useIsCompact } from "@hooks/useIsCompact";
import { usePagination } from "@hooks/usePagination";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { clearNewOrderRequest, setViewMode } from "@store/slices/uiSlice";
import { DELIVERY_ROUNDS, roundLabel } from "@constants/index";
import { formatCurrency, formatDeliveryDate } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { RecordPaymentModal } from "@features/payments/index";
import {
  useGetCustomersQuery,
  useSetCustomerPausedMutation,
} from "@features/customers/index";
import {
  ALL_BOOKS,
  CURRENT_BOOK,
  CloseRoundBookDialog,
  RoundBookBar,
  RoundBookStatementsModal,
  useGetCurrentRoundBookQuery,
  type BookSelection,
} from "@features/round-books/index";
import { useGetOrdersQuery } from "../api/ordersApi";
import { InvoiceModal } from "./InvoiceModal";
import { OrderDetailModal } from "./OrderDetailModal";
import { OrderWizard } from "./OrderWizard";

const totalUnits = (order: Order) =>
  order.items.reduce((sum, line) => sum + line.qty, 0);

const statusTone = (status: PaymentStatus) => {
  if (status === PaymentStatus.Paid) return "success";
  return status === PaymentStatus.Partial ? "info" : "warning";
};

export function OrdersView() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewModes.orders);
  // A seven-column table cannot be read on a 360px screen, so below `sm` the
  // registry shows cards whatever the stored preference says. The preference is
  // left untouched — it is what the operator chose for their desktop, and going
  // back there should not require setting it again.
  const compact = useIsCompact();
  const mode = compact ? ViewMode.Grid : viewMode;
  // Whoever is signed in is who the ledger records as taking the money.
  const user = useAppSelector((state) => state.auth.user);
  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useGetOrdersQuery();

  const [locallyOpen, setLocallyOpen] = useState(false);
  // Ids, not rows: a payment recorded from either dialog changes the figures
  // the other one shows, and a captured object would keep printing the old ones.
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [collectingId, setCollectingId] = useState<string | undefined>();
  const [viewingId, setViewingId] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | PaymentStatus>("");
  const [round, setRound] = useState("");
  const [bookSelection, setBookSelection] =
    useState<BookSelection>(CURRENT_BOOK);
  const [closingBook, setClosingBook] = useState<RoundBook | undefined>();
  const [statementsBookId, setStatementsBookId] = useState<
    string | undefined
  >();

  // A book belongs to one named round, so the book controls only exist once a
  // round is picked — "No round" and "all rounds" have no week to close.
  const namedRound = round !== "" && round !== "none";
  const { data: currentBook } = useGetCurrentRoundBookQuery(round, {
    skip: !namedRound,
  });
  // Pause lives on the customer, not the order, so it is read from the
  // directory. Only needed once a round is picked — that is where the pause
  // buttons appear.
  const { data: customers = [] } = useGetCustomersQuery(undefined, {
    skip: !namedRound,
  });
  const pausedIds = useMemo(
    () => new Set(customers.filter((c) => c.paused).map((c) => c.id)),
    [customers],
  );
  const [setPaused, { isLoading: pausing, originalArgs: pausingArgs }] =
    useSetCustomerPausedMutation();
  const togglePause = (customerId: string) =>
    void setPaused({ id: customerId, paused: !pausedIds.has(customerId) });
  // The pause and close controls belong to this week only: a closed week is
  // history, and pausing from it would read as changing the past.
  const onThisWeek = namedRound && bookSelection === CURRENT_BOOK;

  // Customers on this round with no bill in this week's book — paused ones,
  // and ones resumed after a pause. mymilkman keeps them on the round's list;
  // without this a paused customer would vanish and could never be resumed.
  const notBilled = useMemo(() => {
    if (!onThisWeek || !currentBook) return [];
    const billed = new Set(
      orders
        .filter((o) => o.roundBook === currentBook.id)
        .map((o) => o.customerId),
    );
    return customers
      .filter((c) => c.round === round && !billed.has(c.id))
      .map((c) => ({
        ...c,
        // A bill on this round in an earlier week is what the close copies.
        hasPastBill: orders.some(
          (o) => o.customerId === c.id && o.customer.round === round,
        ),
      }));
  }, [onThisWeek, currentBook, orders, customers, round]);
  const returning = notBilled.filter((c) => !c.paused && c.hasPastBill).length;
  // The book the table is narrowed to, if any. Until the open book has loaded
  // the round's orders are shown unnarrowed rather than as an empty table.
  const bookFilter = !namedRound
    ? undefined
    : bookSelection === ALL_BOOKS
      ? undefined
      : bookSelection === CURRENT_BOOK
        ? currentBook?.id
        : bookSelection;

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
            order.customer.postcode,
            order.courier,
            roundLabel(order.customer.round),
          ) &&
          (!status || order.status === status) &&
          // "none" is a real choice — it finds the walk-in orders that belong to
          // no round at all.
          (round === "" ||
            (round === "none"
              ? order.customer.round === ""
              : order.customer.round === round)) &&
          (!bookFilter || order.roundBook === bookFilter),
      ),
    [orders, search, status, round, bookFilter],
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

  const receipt = orders.find((order) => order.id === receiptId);
  const collecting = orders.find((order) => order.id === collectingId);
  const viewing = orders.find((order) => order.id === viewingId);

  // Registry-wide, not filter-scoped: these answer "what is outstanding across
  // the till", which a search for one customer should not change.
  const stats = useMemo(() => {
    // Every figure sums `total` and `settledAmount`, never `grandTotal`: an
    // earlier balance printed on a docket is money already counted on the bill
    // it came from, and adding it here would count the same debt twice.
    const billed = orders.reduce((n, o) => n + o.total, 0);
    const collected = orders.reduce((n, o) => n + o.settledAmount, 0);
    const open = orders.filter((o) => o.status !== PaymentStatus.Paid);
    return {
      count: orders.length,
      billed,
      collected,
      openCount: open.length,
      outstanding: billed - collected,
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
            label="Billed"
            value={formatCurrency(stats.billed)}
            icon={LuReceiptText}
            tone="accent"
            caption="Goods delivered"
          />
          <StatCard
            label="Collected"
            value={formatCurrency(stats.collected)}
            icon={LuBanknote}
            tone="success"
            caption="Cash received"
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(stats.outstanding)}
            icon={LuClock}
            tone={stats.outstanding > 0 ? "danger" : "success"}
            caption={`${stats.openCount} bill${
              stats.openCount === 1 ? "" : "s"
            } still open`}
          />
        </div>
      )}

      <Toolbar
        actions={
          <>
            <ViewToggle
              className="hidden sm:flex"
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
          placeholder="Search txn, customer, phone, address, round..."
          className="w-full sm:w-56 lg:w-72"
        />
        <Select
          aria-label="Filter by payment status"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "" | PaymentStatus)
          }
          placeholder="All Statuses"
          options={[
            { value: PaymentStatus.Unpaid, label: "Unpaid" },
            { value: PaymentStatus.Partial, label: "Part Paid" },
            { value: PaymentStatus.Paid, label: "Paid" },
          ]}
          className="w-full sm:w-auto"
        />
        <Select
          aria-label="Filter by delivery round"
          value={round}
          onChange={(event) => {
            setRound(event.target.value);
            // A book code means nothing on another round.
            setBookSelection(CURRENT_BOOK);
          }}
          placeholder="Select Round"
          options={[
            ...DELIVERY_ROUNDS.map((r) => ({ value: r.id, label: r.label })),
            { value: "none", label: "No round" },
          ]}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      {namedRound ? (
        <RoundBookBar
          roundId={round}
          selection={bookSelection}
          onSelect={setBookSelection}
          onClose={setClosingBook}
          onStatements={setStatementsBookId}
        />
      ) : null}

      {isError ? (
        <ErrorState
          title="Couldn't load transactions"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <RegistrySkeleton
          viewMode={mode}
          label="Loading transactions"
          columns={5}
        />
      ) : orders.length === 0 ? (
        <EmptyState message="No transactions recorded" icon={LuReceiptText} />
      ) : filtered.length === 0 ? (
        // Distinct from "none recorded" — the registry has rows, this filter
        // just doesn't match any, and the fix is to change the filter. A book
        // with nothing in it is its own case: a week that has only just been
        // opened is empty, not mis-filtered.
        <EmptyState
          message={
            bookFilter && !search && !status
              ? "No orders in this round book yet"
              : "No transactions match this search"
          }
          icon={bookFilter && !search && !status ? LuReceiptText : LuSearchX}
        />
      ) : mode === ViewMode.Grid ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((order) => (
            <Card key={order.id} interactive padded={false}>
              <div className="flex-1 p-[18px] pb-3.5">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <span className="text-foreground-strong font-mono text-xs font-bold">
                    {order.id}
                  </span>
                  <Badge pill tone={statusTone(order.status)}>
                    {order.status}
                  </Badge>
                </div>

                <p className="text-foreground-strong flex items-center gap-1.5 truncate text-[15px] font-bold">
                  {order.customer.name}
                  {namedRound && pausedIds.has(order.customerId) ? (
                    <Badge tone="danger">Paused</Badge>
                  ) : null}
                </p>
                <p className="text-foreground-muted mt-0.5 truncate text-[12.5px]">
                  {order.customer.phone}
                </p>
                <p className="text-foreground-subtle mt-0.5 truncate text-[12.5px]">
                  Courier: {order.courier}
                </p>
                {/* The same delivery day the table column states, so the two
                    views of the registry answer "when does this go out" the
                    same way. */}
                <p className="text-foreground-subtle mt-0.5 truncate text-[12.5px]">
                  {order.deliveryDate
                    ? formatDeliveryDate(order.deliveryDate)
                    : order.date}
                </p>
                <p className="mt-1.5">
                  <Badge tone={order.customer.round ? "accent" : "neutral"}>
                    {roundLabel(order.customer.round)}
                  </Badge>
                </p>

                <div className="mt-3 flex items-baseline gap-2">
                  {/* This delivery's own goods. The account balance is a
                      separate line: one is a fact about this bill, the other
                      moves every time cash comes in. */}
                  <span className="text-foreground-strong font-display text-xl font-bold">
                    {formatCurrency(order.total)}
                  </span>
                  <span className="text-foreground-subtle text-xs">
                    {totalUnits(order)} items
                  </span>
                </div>
                {order.customerBalance > 0 ? (
                  <p className="text-warning-text text-micro mt-1 font-bold">
                    {formatCurrency(order.customerBalance)} owed on this account
                  </p>
                ) : null}
              </div>

              <CardActions
                actions={[
                  ...(onThisWeek
                    ? [
                        {
                          label: pausedIds.has(order.customerId)
                            ? "Resume"
                            : "Pause",
                          icon: pausedIds.has(order.customerId)
                            ? LuPlay
                            : LuPause,
                          tone: "danger" as const,
                          onClick: () => togglePause(order.customerId),
                        },
                      ]
                    : []),
                  {
                    label: "View",
                    icon: LuEye,
                    tone: "accent",
                    onClick: () => setViewingId(order.id),
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
          ))}
        </div>
      ) : (
        <Table
          minWidth="680px"
          headers={[
            { label: "Date" },
            { label: "Customer" },
            { label: "Round" },
            { label: "Due at door" },
            { label: "Actions", align: "right" },
          ]}
        >
          {pageItems.map((order) => (
            <TableRow key={order.id}>
              {/* The delivery day, not the minute the bill was raised — the
                  registry is read as "what goes out when", and an order taken
                  Friday for Monday's round would answer the wrong question.
                  Falls back to the raised timestamp for bills issued before a
                  delivery date could be chosen. The Txn ID has not gone
                  anywhere: it heads the View dialog and the receipt. */}
              <TableCell className="text-foreground font-bold whitespace-nowrap">
                {order.deliveryDate ? (
                  <>
                    {formatDeliveryDate(order.deliveryDate)}
                    <span className="text-nano text-foreground-subtle block font-semibold">
                      Raised {order.date}
                    </span>
                  </>
                ) : (
                  order.date
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <div className="text-foreground flex items-center gap-1.5 font-bold">
                  {order.customer.name}
                  {namedRound && pausedIds.has(order.customerId) ? (
                    <Badge tone="danger">Paused</Badge>
                  ) : null}
                </div>
                <div className="text-nano text-foreground-subtle">
                  {order.customer.phone}
                </div>
              </TableCell>
              {/* The round the customer was on when the bill was raised, copied
                  onto the order — it is what dispatch sorts the van by, so it
                  gets a column of its own. Walk-ins keep a neutral badge: "no
                  round" is an answer, not an empty cell. */}
              <TableCell className="whitespace-nowrap">
                <Badge tone={order.customer.round ? "accent" : "neutral"}>
                  {roundLabel(order.customer.round)}
                </Badge>
              </TableCell>
              <TableCell className="text-foreground-strong font-extrabold whitespace-nowrap">
                {formatCurrency(order.grandTotal)}
                {order.previousBalance > 0 ? (
                  <span className="text-nano text-warning-text block font-semibold">
                    incl. {formatCurrency(order.previousBalance)} earlier
                  </span>
                ) : null}
              </TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                <div className="flex justify-end gap-1.5">
                  {onThisWeek ? (
                    <PauseButton
                      paused={pausedIds.has(order.customerId)}
                      busy={pausing && pausingArgs?.id === order.customerId}
                      onClick={() => togglePause(order.customerId)}
                    />
                  ) : null}
                  {/* The receipt lives inside this dialog now — one door into
                      the transaction, rather than two buttons on the row that
                      each show a different half of it. */}
                  <button
                    type="button"
                    onClick={() => setViewingId(order.id)}
                    className="text-accent-text border-border hover:bg-accent-soft rounded-control-sm text-label inline-flex items-center gap-1 border px-2.5 py-1 font-bold transition-colors"
                  >
                    <LuEye className="h-3.5 w-3.5" aria-hidden />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectingId(order.id)}
                    className="text-info-text border-border hover:bg-info-soft rounded-control-sm text-label inline-flex items-center gap-1 border px-2.5 py-1 font-bold transition-colors"
                  >
                    <LuHandCoins className="h-3.5 w-3.5" aria-hidden />
                    Collect
                  </button>
                </div>
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

      {onThisWeek && notBilled.length > 0 && !isLoading && !isError ? (
        <section
          aria-label="Customers not billed this week"
          className="bg-surface border-border rounded-card border shadow-card"
        >
          <h3 className="text-foreground-strong border-border-subtle border-b px-4 py-2.5 text-xs font-bold sm:px-5">
            Not billed this week
          </h3>
          <ul className="divide-border-subtle divide-y">
            {notBilled.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs sm:px-5"
              >
                <div className="min-w-0">
                  <span className="text-foreground-strong font-bold">
                    {c.name}
                  </span>{" "}
                  <span className="text-foreground-subtle font-mono">
                    [{c.id}]
                  </span>
                  <span className="text-foreground-muted block">
                    {c.paused
                      ? "Paused: no bill next week"
                      : c.hasPastBill
                        ? "Back next week: their last bill will be repeated"
                        : "No bill yet. Create an order to add them to the round."}
                  </span>
                </div>
                {c.paused || c.hasPastBill ? (
                  <PauseButton
                    paused={c.paused}
                    busy={pausing && pausingArgs?.id === c.id}
                    onClick={() => togglePause(c.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* mymilkman puts Close Round Book at the foot of the list as well as the
          top: it is the last thing done after working down the round. */}
      {onThisWeek && currentBook && !isLoading && !isError ? (
        <div className="flex justify-end">
          <Button
            icon={LuBookCheck}
            onClick={() => setClosingBook(currentBook)}
          >
            Close Round Book
          </Button>
        </div>
      ) : null}

      {wizardOpen ? (
        <OrderWizard onClose={closeWizard} onIssued={setReceiptId} />
      ) : null}

      {viewing ? (
        <OrderDetailModal
          order={viewing}
          onReceipt={() => {
            setReceiptId(viewing.id);
            setViewingId(undefined);
          }}
          onClose={() => setViewingId(undefined)}
        />
      ) : null}

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

      {closingBook ? (
        <CloseRoundBookDialog
          book={closingBook}
          pausedIds={pausedIds}
          returning={returning}
          onClose={() => {
            setClosingBook(undefined);
            // Back to this week's book, which is now the one just opened.
            setBookSelection(CURRENT_BOOK);
          }}
        />
      ) : null}

      {statementsBookId ? (
        <RoundBookStatementsModal
          bookId={statementsBookId}
          onClose={() => setStatementsBookId(undefined)}
        />
      ) : null}

      {collecting ? (
        <RecordPaymentModal
          order={collecting}
          receivedBy={user?.name ?? "Admin"}
          onClose={() => setCollectingId(undefined)}
        />
      ) : null}
    </div>
  );
}

/**
 * mymilkman's per-row pause: grey when the customer is active, red when
 * paused. A paused customer gets no bill when the round book closes.
 */
function PauseButton({
  paused,
  busy,
  onClick,
}: {
  paused: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const Icon = paused ? LuPlay : LuPause;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={paused}
      title={
        paused
          ? "Paused: no bill next week. Click to resume."
          : "Pause: no bill next week"
      }
      className={
        paused
          ? "bg-danger text-foreground-on-accent hover:bg-danger-hover rounded-control-sm text-label inline-flex items-center gap-1 px-2.5 py-1 font-bold transition-colors disabled:opacity-60"
          : "text-foreground-muted border-border hover:bg-surface-subtle rounded-control-sm text-label inline-flex items-center gap-1 border px-2.5 py-1 font-bold transition-colors disabled:opacity-60"
      }
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {paused ? "Paused" : "Pause"}
    </button>
  );
}
