"use client";

import type { SelectHTMLAttributes } from "react";
import { inputClass } from "./inputClass";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  /** Rendered as an empty-valued first option, e.g. "All Categories". */
  placeholder?: string;
}

export function Select({
  options,
  placeholder,
  className,
  ...rest
}: SelectProps) {
  return (
    <select className={inputClass(className)} {...rest}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {/* Keyed by position: an option's `value` is not guaranteed unique — two
          couriers can share a name, and the courier select uses the name as its
          value because that is what an order stores. */}
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
