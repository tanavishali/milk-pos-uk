"use client";

import { LuSearch, LuX } from "react-icons/lu";
import { cn } from "@utils/libs/cn";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Shows a clear affordance once there is a query — used inside the wizard. */
  clearable?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className,
  clearable = false,
}: SearchInputProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <LuSearch
        className="text-foreground-subtle pointer-events-none absolute left-3 h-4 w-4"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "bg-surface border-border-input rounded-control w-full border py-2.5 pl-9 text-[13.5px]",
          "text-foreground placeholder:text-foreground-subtle outline-none transition-colors",
          "focus:ring-accent-ring focus:border-border-focus focus:ring-2",
          // Hide the WebKit clear affordance; `clearable` renders our own.
          "[&::-webkit-search-cancel-button]:hidden",
          clearable ? "pr-8" : "pr-3",
        )}
      />
      {clearable && value.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="text-foreground-subtle hover:text-foreground-body absolute right-2.5 transition-colors"
        >
          <LuX className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
