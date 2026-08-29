export interface Courier {
  id: string;
  name: string;
  phone: string;
  idcard: string;
  email: string;
  /**
   * The area this courier covers — the round's patch, in whatever words the
   * operator uses for it locally.
   *
   * Separate from `address`, because they answer different questions: the
   * address is where this person lives, the area is where they deliver. Dispatch
   * needs the second one, and it is not reliably recoverable from the first.
   */
  area: string;
  address: string;
}

/**
 * `password` is write-only: the form collects it, the API accepts it, and it is
 * never part of a `Courier` read back out. Nothing should be able to render it.
 */
export type CourierDraft = Omit<Courier, "id"> & { password?: string };
