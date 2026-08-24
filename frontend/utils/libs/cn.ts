type ClassValue = string | number | null | undefined | false;

/**
 * Join class names, dropping anything falsy. Deliberately not `clsx` +
 * `tailwind-merge`: nothing here composes conflicting utilities from two
 * sources, so a 6-line join beats two dependencies.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
