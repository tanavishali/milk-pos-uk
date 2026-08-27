"use client";

import {
  LuEye,
  LuLayers,
  LuPackage,
  LuPackageX,
  LuPencil,
  LuPlus,
  LuTag,
  LuTrash,
  LuTriangleAlert,
  LuWallet,
} from "react-icons/lu";
import { useMemo, useState } from "react";
import { LOW_STOCK_THRESHOLD, type Product } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import {
  Card,
  CardActions,
  PageHeader,
  StatCard,
  Toolbar,
} from "@components/ui/cards";
import {
  Badge,
  Pagination,
  Table,
  TableCell,
  TableRow,
  ViewToggle,
} from "@components/ui/data-display";
import { SearchInput, Select } from "@components/ui/fields";
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
import { distinctCount, formatCurrency } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { cn } from "@utils/libs/cn";
import { reportError } from "@utils/libs/reportError";
import {
  useDeleteProductMutation,
  useGetCategoriesQuery,
  useGetProductsQuery,
} from "../api/productsApi";
import { CategoryModal } from "./CategoryModal";
import { ProductModal } from "./ProductModal";

export function ProductsView() {
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector((state) => state.ui.viewModes.products);
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<Product | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | undefined>();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [viewing, setViewing] = useState<Product | undefined>();

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          matchesQuery(search, p.name) &&
          (!category || p.category === category),
      ),
    [products, search, category],
  );

  const { pageItems, startIndex, canPrev, canNext, step } =
    usePagination(filtered);

  // Catalogue-wide, not filter-scoped: "how much stock do I hold" should not
  // change because someone typed into the search box.
  const stats = useMemo(() => {
    const low = products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD);
    return {
      count: products.length,
      lowCount: low.length,
      stockValue: products.reduce(
        (sum, p) => sum + p.salePrice * p.quantity,
        0,
      ),
      units: products.reduce((sum, p) => sum + p.quantity, 0),
      categoryCount: distinctCount(products.map((p) => p.category)),
    };
  }, [products]);

  const openCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteError(undefined);
    try {
      await deleteProduct(pendingDelete.id).unwrap();
      setPendingDelete(undefined);
    } catch (error) {
      // The dialog stays open carrying the reason. Closing on a failure would
      // read as "deleted" for a record that is still there.
      reportError(error, "deleteProduct");
      setDeleteError("Could not delete this product. Please try again.");
    }
  };

  const cancelDelete = () => {
    setPendingDelete(undefined);
    setDeleteError(undefined);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Master Items"
        subtitle="Catalogue, pricing and stock on hand"
      />

      {isError ? null : isLoading ? (
        <SkeletonStatCards />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Total Items"
            value={stats.count}
            icon={LuPackage}
            tone="accent"
            caption={`${stats.units} units on hand`}
          />
          <StatCard
            label="Stock Value"
            value={formatCurrency(stats.stockValue)}
            icon={LuWallet}
            tone="success"
            caption="At sale price"
          />
          <StatCard
            label="Low Stock"
            value={stats.lowCount}
            icon={LuTriangleAlert}
            tone={stats.lowCount > 0 ? "danger" : "success"}
            caption={`Below ${LOW_STOCK_THRESHOLD} units`}
          />
          <StatCard
            label="Categories"
            value={stats.categoryCount}
            icon={LuLayers}
            caption="In use"
          />
        </div>
      )}

      <Toolbar
        actions={
          <>
            <ViewToggle
              value={viewMode}
              onChange={(mode) =>
                dispatch(setViewMode({ key: "products", mode }))
              }
              order={[ViewMode.Grid, ViewMode.List]}
            />
            <Button
              variant="secondary"
              icon={LuTag}
              onClick={() => setCategoryOpen(true)}
            >
              Category
            </Button>
            <Button icon={LuPlus} block onClick={openCreate}>
              Add Product
            </Button>
          </>
        }
      >
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search master items..."
          className="w-full sm:max-w-xs"
        />
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="All Categories"
          options={categories.map((c) => ({ value: c, label: c }))}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      {isError ? (
        <ErrorState
          title="Couldn't load master items"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <RegistrySkeleton
          viewMode={viewMode}
          label="Loading master items"
          columns={6}
        />
      ) : filtered.length === 0 ? (
        <EmptyState message="No items found" icon={LuPackageX} />
      ) : viewMode === ViewMode.Grid ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageItems.map((product) => (
            <Card key={product.id} interactive padded={false}>
              <div className="flex-1 p-[18px] pb-3.5">
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <Badge tone="accent" uppercase>
                    {product.category}
                  </Badge>
                  <span
                    className={cn(
                      "text-micro font-bold whitespace-nowrap",
                      product.quantity < LOW_STOCK_THRESHOLD
                        ? "text-danger-text"
                        : "text-foreground-subtle",
                    )}
                  >
                    Qty: {product.quantity}
                  </span>
                </div>

                <p className="text-foreground-strong text-[15px] font-bold">
                  {product.name}
                </p>
                <p className="text-foreground-subtle text-[11.5px] font-semibold">
                  {product.id}
                </p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-foreground-strong font-display text-xl font-bold">
                    {formatCurrency(product.salePrice)}
                  </span>
                  <span className="text-foreground-subtle text-xs line-through">
                    {formatCurrency(product.retailPrice)}
                  </span>
                </div>
              </div>

              <CardActions
                actions={[
                  {
                    label: "View",
                    icon: LuEye,
                    tone: "info",
                    onClick: () => setViewing(product),
                  },
                  {
                    label: "Edit",
                    icon: LuPencil,
                    tone: "accent",
                    onClick: () => {
                      setEditing(product);
                      setModalOpen(true);
                    },
                  },
                  {
                    label: "Delete",
                    icon: LuTrash,
                    tone: "danger",
                    onClick: () => setPendingDelete(product),
                  },
                ]}
              />
            </Card>
          ))}
        </div>
      ) : (
        <Table
          headers={[
            { label: "Item Name" },
            { label: "Category" },
            { label: "Retail Price" },
            { label: "Sale Price" },
            { label: "Stock" },
            { label: "Actions", align: "right" },
          ]}
        >
          {pageItems.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="text-foreground font-bold">
                {product.name}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                <Badge>{product.category}</Badge>
              </TableCell>
              <TableCell className="text-foreground-subtle whitespace-nowrap line-through">
                {formatCurrency(product.retailPrice)}
              </TableCell>
              <TableCell className="text-foreground-strong font-bold whitespace-nowrap">
                {formatCurrency(product.salePrice)}
              </TableCell>
              <TableCell
                className={cn(
                  "font-semibold whitespace-nowrap",
                  product.quantity < LOW_STOCK_THRESHOLD
                    ? "text-danger"
                    : "text-foreground-body",
                )}
              >
                {product.quantity}
              </TableCell>
              <TableCell align="right" className="whitespace-nowrap">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setViewing(product)}
                    className="text-foreground-muted text-label font-bold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(product);
                      setModalOpen(true);
                    }}
                    className="text-accent-text text-label font-bold"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(product)}
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
          title="Item Details"
          heading={viewing.name}
          meta={viewing.id}
          icon={LuPackage}
          badges={[{ label: viewing.category, tone: "accent" }]}
          onClose={() => setViewing(undefined)}
          onEdit={() => {
            const target = viewing;
            setViewing(undefined);
            setEditing(target);
            setModalOpen(true);
          }}
          highlights={[
            {
              label: "Sale price",
              value: formatCurrency(viewing.salePrice),
              tone: "accent",
              caption: `${formatCurrency(viewing.retailPrice)} retail`,
            },
            {
              label: "Stock on hand",
              value: viewing.quantity,
              tone:
                viewing.quantity < LOW_STOCK_THRESHOLD ? "danger" : "success",
              caption:
                viewing.quantity < LOW_STOCK_THRESHOLD
                  ? "Below reorder point"
                  : "In stock",
            },
            {
              label: "Stock value",
              value: formatCurrency(viewing.salePrice * viewing.quantity),
              caption: "At sale price",
            },
          ]}
          fields={[
            { label: "Category", value: viewing.category },
            {
              label: "Retail price",
              value: formatCurrency(viewing.retailPrice),
            },
            { label: "Sale price", value: formatCurrency(viewing.salePrice) },
            {
              label: "Discount off retail",
              value: `${formatCurrency(viewing.retailPrice - viewing.salePrice)} (${
                viewing.retailPrice > 0
                  ? Math.round(
                      ((viewing.retailPrice - viewing.salePrice) /
                        viewing.retailPrice) *
                        100,
                    )
                  : 0
              }%)`,
            },
          ]}
        />
      ) : null}

      {modalOpen ? (
        <ProductModal product={editing} onClose={() => setModalOpen(false)} />
      ) : null}

      {categoryOpen ? (
        <CategoryModal onClose={() => setCategoryOpen(false)} />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="Delete this product?"
          message={`${pendingDelete.name} will be removed from the master item list. Orders that already include it are unaffected.`}
          loading={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={cancelDelete}
        />
      ) : null}
    </div>
  );
}
