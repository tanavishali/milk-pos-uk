import type { Courier, Customer } from "@app-types/index";

/**
 * Read-through copies of the registries that have moved to the API, for the
 * mocks that have not moved yet.
 *
 * Customers and couriers live in MongoDB now, but `ordersMock.create()` still
 * has to copy a customer and resolve a courier name onto the order it raises,
 * and `paymentsMock.create()` still has to check a customer exists. None of
 * them can reach the API: they are plain synchronous functions outside React,
 * with no access to the query cache.
 *
 * So `customersApi` and `couriersApi` hand their lists over here whenever they
 * load one. This is a bridge, not a store — nothing is written through it, and
 * it disappears with the orders and payments endpoints.
 *
 * Consequence worth knowing: an order can only be raised in a tab that has
 * loaded both registries at least once. The wizard does, because picking a
 * customer and a courier is how an order is built.
 */
let customers: Customer[] = [];
let couriers: Courier[] = [];

export function setKnownCustomers(rows: Customer[]): void {
  customers = rows;
}

export function findKnownCustomer(id: string): Customer | undefined {
  return customers.find((customer) => customer.id === id);
}

export function setKnownCouriers(rows: Courier[]): void {
  couriers = rows;
}

export function findKnownCourier(id: string): Courier | undefined {
  return couriers.find((courier) => courier.id === id);
}

/** Only the dashboard metrics, which are themselves still mocked. */
export function knownCustomerCount(): number {
  return customers.length;
}

export function knownCourierCount(): number {
  return couriers.length;
}
