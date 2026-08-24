export interface Courier {
  id: string;
  name: string;
  phone: string;
  idcard: string;
  email: string;
  address: string;
}

/**
 * `password` is write-only: the form collects it, the API accepts it, and it is
 * never part of a `Courier` read back out. Nothing should be able to render it.
 */
export type CourierDraft = Omit<Courier, "id"> & { password?: string };
