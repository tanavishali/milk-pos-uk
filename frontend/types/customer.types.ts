export interface Customer {
  id: string;
  name: string;
  phone: string;
  idcard: string;
  address: string;
}

/** The writable half of a Customer — what a form collects. */
export type CustomerDraft = Omit<Customer, "id">;
