"use client";

import { LuCheck, LuPackageX } from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Product } from "@app-types/index";
import { Badge } from "@components/ui/data-display";
import { SearchInput, Select } from "@components/ui/fields";
import { EmptyState } from "@components/ui/states";
import { WEEKDAY_SHORT } from "@enums/index";
import { formatCurrency } from "@utils/helper/format";
import { matchesQuery } from "@utils/helper/search";
import { cn } from "@utils/libs/cn";
import { ONE_OFF, type OrderWizardController } from "../hooks/useOrderWizard";

interface WizardItemsStepProps {
  products: Product[];
  categories: string[];
  wizard: OrderWizardController;
}

/**
 * Step 2: pick items, override the selling price, set quantities. The price
 * override is the point of this screen — a cashier haggles, and the receipt has
 * to reflect what was actually charged.
 */
export function WizardItemsStep({
  products,
  categories,
  wizard,
}: WizardItemsStepProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          matchesQuery(search, p.name, p.category) &&
          (!category || p.category === category),
      ),
    [products, search, category],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div>
          <h4 className="text-foreground-body text-xs font-extrabold">
            Step 2: Select Items &amp; Set Custom Prices
          </h4>
          <p className="text-micro text-foreground-subtle">
            {wizard.isSplitByDay
              ? "Build each delivery day separately. Switch days with the tabs."
              : "Tap the circle to select. Adjust selling price or quantity inline."}
          </p>
        </div>
        <span
          aria-live="polite"
          className="text-accent-text bg-accent-soft border-accent-muted rounded-control-sm self-start border px-2.5 py-0.5 text-xs font-extrabold sm:self-auto"
        >
          Order total: {formatCurrency(wizard.total)}
        </span>
      </div>

      {/* One tab per delivery day. Each carries its own running count and
          subtotal, so the cashier can see at a glance which day is still empty
          without switching to it. */}
      {wizard.isSplitByDay ? (
        <div
          role="tablist"
          aria-label="Delivery day"
          className="border-border flex gap-1 overflow-x-auto border-b pb-2"
        >
          {wizard.buckets.map((bucket) => {
            const on = bucket.day === wizard.activeDay;
            return (
              <button
                key={bucket.day}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => wizard.setActiveDay(bucket.day)}
                className={cn(
                  "rounded-control shrink-0 border px-3 py-2 text-left transition-colors",
                  on
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:border-border-strong hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "block text-xs font-bold",
                    on ? "text-accent-text" : "text-foreground-body",
                  )}
                >
                  {bucket.day === ONE_OFF
                    ? "One-off"
                    : WEEKDAY_SHORT[bucket.day]}
                </span>
                <span
                  className={cn(
                    "text-nano block",
                    bucket.itemCount > 0
                      ? "text-foreground-muted"
                      : "text-foreground-subtle",
                  )}
                >
                  {bucket.itemCount > 0
                    ? `${bucket.itemCount} item${bucket.itemCount === 1 ? "" : "s"} · ${formatCurrency(bucket.total)}`
                    : "Empty"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          clearable
          placeholder="Search items by name or category..."
          className="sm:col-span-2"
        />
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="All Categories"
          options={categories.map((c) => ({ value: c, label: c }))}
        />
      </div>

      {wizard.isSplitByDay ? (
        <p className="text-foreground-subtle text-micro">
          Adding to{" "}
          <strong className="text-accent-text font-bold">
            {wizard.activeDay === ONE_OFF
              ? "this one-off order"
              : WEEKDAY_SHORT[wizard.activeDay]}
          </strong>
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          inset
          icon={LuPackageX}
          message="No matching products found."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const line = wizard.lineFor(product.id);
            const qty = line?.qty ?? 0;
            const price = line?.price ?? product.salePrice;
            const isSelected = qty > 0;
            const outOfStock = product.quantity === 0;

            return (
              <div
                key={product.id}
                className={cn(
                  "rounded-control flex flex-col gap-2 border p-2.5 text-xs transition-all sm:p-3",
                  isSelected
                    ? "border-accent bg-accent-soft/70 ring-accent-ring shadow-card ring-1"
                    : "border-border hover:border-border-strong hover:bg-surface-muted",
                )}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    disabled={outOfStock}
                    onClick={() => wizard.toggleProduct(product, !isSelected)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:opacity-60"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        isSelected
                          ? "border-accent bg-accent"
                          : "border-border-strong bg-surface",
                      )}
                    >
                      {isSelected ? (
                        <LuCheck
                          className="text-foreground-on-accent h-3 w-3"
                          aria-hidden
                        />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-foreground truncate text-xs font-bold">
                          {product.name}
                        </span>
                        <Badge uppercase>{product.category}</Badge>
                      </span>
                      <span className="text-micro text-foreground-subtle mt-0.5 block">
                        Standard:{" "}
                        <strong className="text-foreground-body font-semibold">
                          {formatCurrency(product.salePrice)}
                        </strong>{" "}
                        &bull;{" "}
                        {outOfStock ? (
                          <strong className="text-danger font-semibold">
                            Out of stock
                          </strong>
                        ) : (
                          <>Stock: {product.quantity}</>
                        )}
                      </span>
                    </span>
                  </button>

                  <span className="text-micro text-foreground-strong bg-surface border-border rounded-control-sm shrink-0 border px-2 py-1 font-extrabold">
                    {formatCurrency(qty * price)}
                  </span>
                </div>

                <div className="border-border/60 flex items-center justify-between gap-2 border-t pt-1">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor={`price-${product.id}`}
                      className="text-nano text-foreground-subtle font-bold uppercase"
                    >
                      Price ($):
                    </label>
                    <input
                      id={`price-${product.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={outOfStock}
                      value={price}
                      onChange={(event) =>
                        wizard.setPrice(
                          product,
                          Number.parseFloat(event.target.value),
                        )
                      }
                      className="bg-surface border-border rounded-control-sm text-accent-text focus:ring-accent-ring w-20 border px-2 py-1 text-xs font-bold shadow-card outline-none focus:ring-1 disabled:opacity-60"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <label
                      htmlFor={`qty-${product.id}`}
                      className="text-nano text-foreground-subtle font-bold uppercase"
                    >
                      Qty:
                    </label>
                    <button
                      type="button"
                      aria-label={`Decrease ${product.name} quantity`}
                      disabled={outOfStock}
                      onClick={() => wizard.adjustQty(product, -1)}
                      className="bg-surface border-border text-foreground-body hover:bg-surface-subtle rounded-control-sm press-scale flex h-7 w-7 items-center justify-center border font-extrabold shadow-card disabled:opacity-60"
                    >
                      &minus;
                    </button>
                    <input
                      id={`qty-${product.id}`}
                      type="number"
                      min="0"
                      max={product.quantity}
                      disabled={outOfStock}
                      value={qty}
                      onChange={(event) =>
                        wizard.setQty(
                          product,
                          Number.parseInt(event.target.value, 10) || 0,
                        )
                      }
                      className="bg-surface border-border rounded-control-sm text-foreground-strong w-11 border py-1 text-center text-xs font-extrabold shadow-card outline-none disabled:opacity-60"
                    />
                    <button
                      type="button"
                      aria-label={`Increase ${product.name} quantity`}
                      disabled={outOfStock || qty >= product.quantity}
                      onClick={() => wizard.adjustQty(product, 1)}
                      className="bg-accent text-foreground-on-accent rounded-control-sm press-scale flex h-7 w-7 items-center justify-center font-extrabold shadow-card disabled:opacity-60"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
