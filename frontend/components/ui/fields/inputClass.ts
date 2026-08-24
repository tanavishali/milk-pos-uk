import { cn } from "@utils/libs/cn";

/**
 * The one input skin. Every text input, select and textarea in the app uses it,
 * so a focus-ring change is one edit rather than forty.
 */
export function inputClass(extra?: string, invalid = false) {
  return cn(
    "w-full rounded-control border bg-surface px-3.5 py-3 text-[13.5px] text-foreground",
    "placeholder:text-foreground-subtle transition-colors outline-none",
    "focus:ring-2 focus:ring-accent-ring focus:border-border-focus",
    "disabled:opacity-60",
    invalid ? "border-danger" : "border-border-input",
    extra,
  );
}
