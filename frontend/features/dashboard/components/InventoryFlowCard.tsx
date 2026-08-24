"use client";

import { Card } from "@components/ui/cards";
import { ErrorState } from "@components/ui/states";
import { useGetProductsQuery } from "@features/products/api/productsApi";
import { useGetOrdersQuery } from "@features/orders/api/ordersApi";

/** Units still on the shelf against units already shipped out. */
export function InventoryFlowCard() {
  const {
    data: products = [],
    isError: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery();
  const {
    data: orders = [],
    isError: ordersError,
    refetch: refetchOrders,
  } = useGetOrdersQuery();

  const inStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const dispatched = orders.reduce(
    (sum, order) => sum + order.items.reduce((n, line) => n + line.qty, 0),
    0,
  );

  return (
    <Card>
      <h4 className="text-foreground mb-2 text-xs font-extrabold">
        Inventory Flow
      </h4>
      {productsError || ordersError ? (
        // Inset: this card owns a corner of the dashboard, and both figures are
        // derived from the failed reads — reporting 0 items would read as a real
        // count of zero.
        <ErrorState
          inset
          title="Inventory unavailable"
          detail="Counts could not be read."
          onRetry={() => {
            void refetchProducts();
            void refetchOrders();
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <div className="bg-surface-muted border-border-subtle rounded-control flex-1 border p-2 text-center">
            <p className="text-micro text-foreground-subtle font-bold uppercase">
              Dispatched
            </p>
            <p className="text-foreground mt-0.5 text-sm font-extrabold">
              {dispatched} Items
            </p>
          </div>
          <div className="bg-success-soft border-success-ring rounded-control flex-1 border p-2 text-center">
            <p className="text-micro text-success-text font-bold uppercase">
              In Stock
            </p>
            <p className="text-success-text mt-0.5 text-sm font-extrabold">
              {inStock} Items
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
