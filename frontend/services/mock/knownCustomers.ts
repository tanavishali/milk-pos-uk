import type { Customer } from "@app-types/index";

/**
 * A read-through copy of the customer directory, for the mocks that have not
 * moved server-side yet.
 *
 * Customers live in MongoDB now, but `ordersMock.create()` still has to copy a
 * customer onto the order it raises, and `paymentsMock.create()` still has to
 * check one exists. Neither can reach the API — they are plain synchronous
 * functions outside React, with no access to the query cache.
 *
 * So `customersApi` hands the list over here every time it loads one. It is a
 * bridge, not a store: nothing writes customers through it, and it disappears
 * with the orders and payments endpoints.
 */
let known: Customer[] = [];

export function setKnownCustomers(customers: Customer[]): void {
  known = customers;
}

export function findKnownCustomer(id: string): Customer | undefined {
  return known.find((customer) => customer.id === id);
}

/** Only the dashboard's `totalCustomers` metric, which is itself still mocked. */
export function knownCustomerCount(): number {
  return known.length;
}
