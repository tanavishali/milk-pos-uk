"use client";

import { LuCheck, LuUserX } from "react-icons/lu";
import { useMemo, useState } from "react";
import type { Customer } from "@app-types/index";
import { SearchInput } from "@components/ui/fields";
import { EmptyState } from "@components/ui/states";
import { matchesQuery } from "@utils/helper/search";
import { cn } from "@utils/libs/cn";

interface WizardCustomerStepProps {
  customers: Customer[];
  selected?: Customer;
  onSelect: (customer: Customer) => void;
}

export function WizardCustomerStep({
  customers,
  selected,
  onSelect,
}: WizardCustomerStepProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        matchesQuery(search, c.name, c.phone, c.idcard, c.address),
      ),
    [customers, search],
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-foreground-body text-xs font-extrabold">
          Step 1: Choose Customer
        </h4>
        <span className="text-micro text-foreground-subtle font-bold">
          {filtered.length} found
        </span>
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        clearable
        placeholder="Search by customer name, phone, or ID..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          inset
          icon={LuUserX}
          message="No matching customers found."
        />
      ) : (
        <div role="radiogroup" aria-label="Customer" className="space-y-1.5">
          {filtered.map((customer) => {
            const isSelected = selected?.id === customer.id;
            return (
              <button
                key={customer.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(customer)}
                className={cn(
                  "rounded-control flex w-full items-center justify-between gap-2.5 border p-2.5 text-left transition-all sm:p-3",
                  isSelected
                    ? "border-accent bg-accent-soft ring-accent-ring ring-1"
                    : "border-border hover:border-border-strong hover:bg-surface-muted",
                )}
              >
                <span className="min-w-0 flex-1 pr-1">
                  <span className="text-foreground block truncate text-xs font-bold">
                    {customer.name}
                  </span>
                  <span className="text-micro text-foreground-subtle block truncate">
                    {customer.phone} &bull; ID: {customer.idcard}
                  </span>
                  <span className="text-nano text-foreground-subtle block truncate">
                    {customer.address}
                  </span>
                </span>
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
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
