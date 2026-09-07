"use client";

import { useState } from "react";

import { inputClass } from "./inputClass";

/** Every number on the books is a UK one, so the dial code is shown, not picked. */
const UK_DIAL_CODE = "+44";

/**
 * Turns a stored number into what belongs in the box: the dial code and the
 * trunk `0` are both the prefix's job, so neither is typed twice.
 */
export function toNationalPhone(stored: string) {
  return stored
    .replace(/[^\d+ ]/g, "")
    .replace(/^\+?(?:0044|44)[ ]?/, "")
    .replace(/^\+/, "")
    .replace(/^0(?=\d)/, "")
    .trimStart();
}

/** The stored shape is always `+44 <national>`, and empty stays empty so `required` still bites. */
export function toStoredPhone(national: string) {
  const typed = national.trim();
  return typed ? `${UK_DIAL_CODE} ${typed}` : "";
}

interface PhoneInputProps {
  id: string;
  /** The stored value, dial code included. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * A phone box with the UK dial code welded to its left edge. The prefix is not
 * an input, so it cannot be cleared or mistyped — the field yields `+44 …` or
 * nothing at all.
 */
export function PhoneInput({ id, value, onChange, required }: PhoneInputProps) {
  // Local, because the box holds the national part while the draft holds the
  // whole number — trimming the draft on every keystroke would eat the spaces
  // a UK number is read aloud with.
  const [national, setNational] = useState(() => toNationalPhone(value));

  const edit = (next: string) => {
    const cleaned = toNationalPhone(next);
    setNational(cleaned);
    onChange(toStoredPhone(cleaned));
  };

  return (
    <div className="flex items-stretch">
      <span
        aria-hidden
        className="rounded-l-control border-border-input bg-surface-muted text-foreground-body flex items-center border border-r-0 px-3 text-[13.5px] font-semibold"
      >
        {UK_DIAL_CODE}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        maxLength={20}
        placeholder="7700 900123"
        aria-describedby={`${id}-dial-code`}
        value={national}
        onChange={(e) => edit(e.target.value)}
        className={inputClass("rounded-l-none")}
      />
      {/* Announced to screen readers, since the visual prefix is decorative. */}
      <span id={`${id}-dial-code`} className="sr-only">
        United Kingdom country code {UK_DIAL_CODE}
      </span>
    </div>
  );
}
