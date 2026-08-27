"use client";

import {
  LuEye,
  LuMail,
  LuMap,
  LuMapPin,
  LuPackageCheck,
  LuPencil,
  LuPhone,
  LuTrash,
  LuTruck,
  LuUserMinus,
  LuUserPlus,
  LuUserX,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Courier } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import {
  Card,
  CardActions,
  PageHeader,
  StatCard,
  Toolbar,
} from "@components/ui/cards";
import {
  Avatar,
  Badge,
  Pagination,
  Table,
  TableCell,
  TableRow,
  ViewToggle,
} from "@components/ui/data-display";
import { SearchInput } from "@components/ui/fields";
import { ConfirmDialog, DetailModal } from "@components/ui/modals";
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
import { cityOf, distinctCount } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { reportError } from "@utils/libs/reportError";
// The api module, not the feature barrel — see the note in CustomersView.
import { useGetOrdersQuery } from "@features/orders/api/ordersApi";
import {
  useDeleteCourierMutation,
  useGetCouriersQuery,
} from "../api/couriersApi";
import { CourierModal } from "./CourierModal";

export function CouriersView() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewModes.couriers);
  const {
    data: couriers = [],
    isLoading,
    isError,
    refetch,
  } = useGetCouriersQuery();
  const [deleteCourier, { isLoading: deleting }] = useDeleteCourierMutation();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Courier | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Courier | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [viewing, setViewing] = useState<Courier | undefined>();

  const { data: orders = [] } = useGetOrdersQuery();

  // Roster-wide. An order stores the courier's name, so this counts by name for
  // the same reason the customer stats do.
  const stats = useMemo(() => {
    const assigned = orders.filter(
      (o) => o.courier && o.courier !== "Unassigned",
    );
    const working = new Set(assigned.map((o) => o.courier));
    const onDuty = couriers.filter((c) => working.has(c.name)).length;
    return {
      count: couriers.length,
      onDuty,
      idle: couriers.length - onDuty,
      deliveries: assigned.length,
      cities: distinctCount(couriers.map((c) => cityOf(c.address))),
    };
  }, [couriers, orders]);

  const filtered = useMemo(
    () =>
      couriers.filter((c) =>
        matchesQuery(search, c.name, c.phone, c.email, c.address),
      ),
    [couriers, search],
  );

  const { pageItems, startIndex, canPrev, canNext, step } =
    usePagination(filtered);

  const openEdit = (courier: Courier) => {
    setEditing(courier);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    try {
      await deleteCourier(pendingDelete.id).unwrap();
      setPendingDelete(undefined);
    } catch (error) {
      // The dialog stays open carrying the reason. Closing on a failure would
      // read as "deleted" for a record that is still there.
      reportError(error, "deleteCourier");
      setDeleteError("Could not delete this courier. Please try again.");
    }
  };

  const cancelDelete = () => {
    setPendingDelete(undefined);
    setDeleteError(undefined);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Couriers & Logistics"
        subtitle="Dispatch roster and delivery coverage"
      />

      {isError ? null : isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Couriers"
            value={stats.count}
            icon={LuTruck}
            tone="accent"
            caption="On the roster"
          />
          <StatCard
            label="On Duty"
            value={stats.onDuty}
            icon={LuPackageCheck}
            tone="success"
            caption={`${stats.deliveries} deliveries assigned`}
          />
          <StatCard
            label="Idle"
            value={stats.idle}
            icon={LuUserMinus}
            tone={stats.idle > 0 ? "danger" : "success"}
            caption="No deliveries yet"
          />
          <StatCard
            label="Cities"
            value={stats.cities}
            icon={LuMap}
            caption="Based across"
          />
        </div>
      )}

      <Toolbar
        actions={
          <>
            <ViewToggle
              value={viewMode}
              onChange={(mode) =>
                dispatch(setViewMode({ key: "couriers", mode }))
              }
            />
            <Button
              icon={LuUserPlus}
              block
              onClick={() => {
                setEditing(undefined);
                setModalOpen(true);
              }}
            >
              Add Courier
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search couriers..."
          className="w-full sm:max-w-xs"
        />
      </Toolbar>

      {isError ? (
        <ErrorState
          title="Couldn't load couriers"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <RegistrySkeleton
          viewMode={viewMode}
          label="Loading couriers"
          columns={5}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="No couriers found" icon={LuUserX} />
      ) : viewMode === ViewMode.Grid ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((courier) => (
            <Card key={courier.id} interactive padded={false}>
              <div className="flex-1 p-[18px] pb-3.5">
                <div className="mb-3.5 flex items-center gap-3">
                  <Avatar name={courier.name} seed={courier.id} />
                  <div className="min-w-0">
                    <p className="text-foreground-strong truncate text-[15px] font-bold">
                      {courier.name}
                    </p>
                    <p className="text-foreground-subtle text-[11.5px] font-semibold">
                      {courier.id}
                    </p>
                  </div>
                </div>

                <p className="text-foreground-body mb-2 flex items-center gap-2 text-[12.5px]">
                  <LuPhone
                    className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">{courier.phone}</span>
                </p>
                <p className="text-foreground-body mb-2 flex items-center gap-2 text-[12.5px]">
                  <LuMail
                    className="text-foreground-subtle h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span className="truncate">{courier.email}</span>
                </p>
                <p className="text-foreground-muted flex items-start gap-2 text-[12.5px] leading-relaxed">
                  <LuMapPin
                    className="text-foreground-subtle mt-0.5 h-3.5 w-3.5 shrink-0"
                    aria-hidden
                  />
                  <span>{courier.address}</span>
                </p>
              </div>

              <CardActions
                actions={[
                  {
                    label: "View",
                    icon: LuEye,
                    tone: "info",
                    onClick: () => setViewing(courier),
                  },
                  {
                    label: "Edit",
                    icon: LuPencil,
                    tone: "accent",
                    onClick: () => openEdit(courier),
                  },
                  {
                    label: "Delete",
                    icon: LuTrash,
                    tone: "danger",
                    onClick: () => setPendingDelete(courier),
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
            { label: "Contact" },
            { label: "National ID" },
            { label: "Address" },
            { label: "Actions", align: "right" },
          ]}
        >
          {pageItems.map((courier) => (
            <TableRow key={courier.id}>
              <TableCell className="text-foreground font-bold">
                {courier.name}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <div>{courier.phone}</div>
                <div className="text-nano text-foreground-subtle">
                  {courier.email}
                </div>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge tone="mono">{courier.idcard}</Badge>
              </TableCell>
              <TableCell className="max-w-[160px] truncate">
                {courier.address}
              </TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(courier)}
                    className="text-foreground-muted text-label font-bold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(courier)}
                    className="text-accent-text text-label font-bold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(courier)}
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
          title="Courier Details"
          heading={viewing.name}
          meta={viewing.id}
          icon={LuTruck}
          onClose={() => setViewing(undefined)}
          onEdit={() => {
            const target = viewing;
            setViewing(undefined);
            openEdit(target);
          }}
          fields={[
            { label: "Phone", value: viewing.phone },
            { label: "National ID", value: viewing.idcard },
            // Full width: courier emails are long enough that the card truncates
            // them, which is the reason to open this dialog at all.
            { label: "Email", value: viewing.email, wide: true },
            { label: "Address", value: viewing.address, wide: true },
          ]}
        />
      ) : null}

      {modalOpen ? (
        <CourierModal courier={editing} onClose={() => setModalOpen(false)} />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete courier?"
          message={`${pendingDelete.name} will be removed from the dispatch roster. Orders already assigned to them keep the name on the receipt.`}
          loading={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      ) : null}
    </div>
  );
}
