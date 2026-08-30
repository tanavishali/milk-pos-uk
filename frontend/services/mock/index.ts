import { authMock } from "./auth.mock";
import { couriersMock } from "./couriers.mock";
import { ordersMock } from "./orders.mock";
import { paymentsMock } from "./payments.mock";

/**
 * The flat mock backend. Endpoints talk to this and nothing else, so swapping in
 * a real API means rewriting `services/api/baseApi.ts` and each feature's
 * `queryFn` — never a component and never a type in `types/`.
 */
export const mockDb = {
  auth: authMock,
  couriers: couriersMock,
  orders: ordersMock,
  payments: paymentsMock,
};

export type { MockDatabase } from "./seed";
export type { StoredOrder } from "./types";
export { delay, READ_LATENCY_MS, WRITE_LATENCY_MS } from "./utils";
export { READ_FAILURE_MESSAGE, setFailReads, shouldFailRead } from "./faults";
export {
  findKnownCustomer,
  knownCustomerCount,
  setKnownCustomers,
} from "./knownCustomers";
