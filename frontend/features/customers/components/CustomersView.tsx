"use client";

import {
  LuCalendarDays,
  LuEye,
  LuMail,
  LuMap,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuPlus,
  LuShoppingBag,
  LuTrash,
  LuUser,
  LuUserPlus,
  LuUserX,
  LuUsers,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Customer } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import {
  Card,
  CardActions,
  PageHeader,
  StatCard,
  Toolbar,
} from "@components/ui/cards";
import { SearchInput, Select } from "@components/ui/fields";
import { ConfirmDialog, DetailModal } from "@components/ui/modals";
import {
  Avatar,
  DayChips,
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
import { ViewMode } from "@enums/index";
import { usePagination } from "@hooks/usePagination";
import { useAppDispatch, useAppSelector } from "@store/hooks";
import { setViewMode } from "@store/slices/uiSlice";
import { DELIVERY_ROUNDS, roundLabel } from "@constants/index";
import { cityOf, distinctCount } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { reportError } from "@utils/libs/reportError";
// The api module, not the feature barrel: `@features/orders/index` re-exports
// OrdersView, which imports back into customers — the barrel would close a
// cycle. Endpoint modules import only baseApi and the mock, so they are safe.
import { useGetOrdersQuery } from "@features/orders/api/ordersApi";
import {
  useDeleteCustomerMutation,
  useGetCustomersQuery,
} from "../api/customersApi";
import { CustomerModal } from "./CustomerModal";

export function CustomersView() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewModes.customers);
  const {
    data: customers = [],
    isLoading,
    isError,
    refetch,
  } = useGetCustomersQuery();
  const [deleteCustomer, { isLoading: deleting }] = useDeleteCustomerMutation();

  const [search, setSearch] = useState("");
  const [round, setRound] = useState("");
  const [editing, setEditing] = useState<Customer | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Customer | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [viewing, setViewing] = useState<Customer | undefined>();

  const { data: orders = [] } = useGetOrdersQuery();

  // Directory-wide, not filter-scoped. "Ordered" is matched on the name the
  // order captured, because an order copies the customer rather than holding a
  // reference — so a renamed customer reads as not-yet-ordered, which is the
  // honest answer for a copied record.
  const stats = useMemo(() => {
    const ordered = new Set(orders.map((o) => o.customer.name));
    const withOrders = customers.filter((c) => ordered.has(c.name)).length;
    return {
      count: customers.length,
      withOrders,
      neverOrdered: customers.length - withOrders,
      cities: distinctCount(customers.map((c) => cityOf(c.address))),
    };
  }, [customers, orders]);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          matchesQuery(
            search,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.postcode,
            roundLabel(c.round),
          ) &&
          // "none" is a real choice, not the absence of one — it finds the
          // customers nobody has scheduled yet.
          (round === "" ||
            (round === "none" ? c.round === "" : c.round === round)),
      ),
    [customers, search, round],
  );

  const { pageItems, startIndex, canPrev, canNext, step } =
    usePagination(filtered);

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    try {
      await deleteCustomer(pendingDelete.id).unwrap();
      setPendingDelete(undefined);
    } catch (error) {
      // The dialog stays open carrying the reason. Closing on a failure would
      // read as "deleted" for a record that is still there.
      reportError(error, "deleteCustomer");
      setDeleteError("Could not delete this customer. Please try again.");
    }
  };

  const cancelDelete = () => {
    setPendingDelete(undefined);
    setDeleteError(undefined);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers Directory"
        subtitle="Contact details and delivery addresses"
      />

      {isError ? null : isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Customers"
            value={stats.count}
            icon={LuUsers}
            tone="accent"
            caption="On the directory"
          />
          <StatCard
            label="Have Ordered"
            value={stats.withOrders}
            icon={LuShoppingBag}
            tone="success"
            caption="At least one order"
          />
          <StatCard
            label="Never Ordered"
            value={stats.neverOrdered}
            icon={LuUserPlus}
            tone={stats.neverOrdered > 0 ? "danger" : "success"}
            caption="Worth a follow-up"
          />
          <StatCard
            label="Cities"
            value={stats.cities}
            icon={LuMap}
            caption="Delivery coverage"
          />
        </div>
      )}

      <Toolbar
        actions={
          <>
            <ViewToggle
              value={viewMode}
              onChange={(mode) =>
                dispatch(setViewMode({ key: "customers", mode }))
              }
            />
            <Button icon={LuPlus} block onClick={openCreate}>
              Add Customer
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
          className="w-full sm:max-w-xs"
        />
        <Select
          aria-label="Filter by delivery round"
          value={round}
          onChange={(event) => setRound(event.target.value)}
          placeholder="Select Round"
          options={[
            ...DELIVERY_ROUNDS.map((r) => ({ value: r.id, label: r.label })),
            { value: "none", label: "No round" },
          ]}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      {isError ? (
        <ErrorState
          title="Couldn't load customers"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <RegistrySkeleton
          viewMode={viewMode}
          label="Loading customers"
          columns={6}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="No customers found" icon={LuUserX} />
      ) : viewMode === ViewMode.Grid ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((customer) => (
            <Card key={customer.id} interactive padded={false}>
              <div className="flex-1 p-[18px] pb-3.5">
                <div className="mb-3.5 flex items-center gap-3">
                  <Avatar name={customer.name} seed={customer.id} />
                  <div className="min-w-0">
                    <p className="text-foreground-strong truncate text-[15px] font-bold">
                      {customer.name}
                    </p>
                    <p className="text-foreground-subtle text-[11.5px] font-semibold">
                      {customer.id}
                    </p>
                  </div>
                </div>

                <p className="text-foreground-body mb-2 flex items-center gap-2 text-[12.5px]">
                  <LuPhone
                    className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">{customer.phone}</span>
                </p>
                <p className="mb-2 flex items-center gap-2">
                  <LuCalendarDays
                    className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <DayChips days={customer.deliveryDays} />
                  <span className="text-foreground-subtle text-micro truncate">
                    {roundLabel(customer.round)}
                  </span>
                </p>
                <p className="text-foreground-body mb-2 flex items-center gap-2 text-[12.5px]">
                  <LuMail
                    className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">{customer.email}</span>
                </p>
                <p className="text-foreground-muted flex items-start gap-2 text-[12.5px] leading-relaxed">
                  <LuMapPin
                    className="text-foreground-subtle mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>
                    {customer.address}
                    <span className="text-foreground-subtle">
                      {" "}
                      &middot; {customer.postcode}
                    </span>
                  </span>
                </p>
              </div>

              <CardActions
                actions={[
                  {
                    label: "View",
                    icon: LuEye,
                    tone: "info",
                    onClick: () => setViewing(customer),
                  },
                  {
                    label: "Edit",
                    icon: LuPencil,
                    tone: "accent",
                    onClick: () => openEdit(customer),
                  },
                  {
                    label: "Delete",
                    icon: LuTrash,
                    tone: "danger",
                    onClick: () => setPendingDelete(customer),
                  },
                ]}
              />
            </Card>
          ))}
        </div>
      ) : (
        <Table
          headers={[
            { label: "Name" },
            { label: "Phone" },
            { label: "Days" },
            { label: "Email" },
            { label: "Address" },
            { label: "Actions", align: "right" },
          ]}
        >
          {pageItems.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="text-foreground font-bold">
                {customer.name}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {customer.phone}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <DayChips days={customer.deliveryDays} />
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <span className="truncate">{customer.email}</span>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="truncate">{customer.address}</div>
                <div className="text-nano text-foreground-subtle">
                  {customer.postcode}
                </div>
              </TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(customer)}
                    className="text-foreground-muted text-label font-bold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(customer)}
                    className="text-accent-text text-label font-bold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(customer)}
                    className="text-danger text-label font-bold"
                  >
                    Delete
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

      {viewing ? (
        <DetailModal
          title="Customer Details"
          heading={viewing.name}
          meta={viewing.id}
          icon={LuUser}
          onClose={() => setViewing(undefined)}
          onEdit={() => {
            const target = viewing;
            setViewing(undefined);
            openEdit(target);
          }}
          fields={[
            { label: "Phone", value: viewing.phone },
            { label: "Delivery Round", value: roundLabel(viewing.round) },
            {
              label: "Delivery Days",
              value: <DayChips days={viewing.deliveryDays} />,
            },
            { label: "Email", value: viewing.email, wide: true },
            { label: "Address", value: viewing.address, wide: true },
            { label: "Post Code", value: viewing.postcode },
          ]}
        />
      ) : null}

      {modalOpen ? (
        <CustomerModal customer={editing} onClose={() => setModalOpen(false)} />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete customer record?"
          message={`${pendingDelete.name} will be removed. Orders already issued to them keep their own copy of these details, so past receipts are unaffected.`}
          loading={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      ) : null}
    </div>
  );
}
