import type { Weekday } from "@enums/index";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  /**
   * Id of the named round this customer sits on, from `constants/rounds.ts`.
   * Empty means not on a round — a walk-in, or someone not yet scheduled.
   */
  round: string;
  /**
   * The days actually delivered. Filled in from the round when one is chosen,
   * but stored separately so a one-off variation does not require inventing a
   * new round.
   */
  deliveryDays: Weekday[];
  email: string;
  address: string;
  /** Postal code for the delivery address. */
  postcode: string;
}

/** The writable half of a Customer — what a form collects. */
export type CustomerDraft = Omit<Customer, "id">;
