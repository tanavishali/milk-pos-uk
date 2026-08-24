import { authMock } from "./auth.mock";
import { couriersMock } from "./couriers.mock";
import { customersMock } from "./customers.mock";
import { ordersMock } from "./orders.mock";
import { categoriesMock, productsMock } from "./products.mock";

/**
 * The flat mock backend. Endpoints talk to this and nothing else, so swapping in
 * a real API means rewriting `services/api/baseApi.ts` and each feature's
 * `queryFn` — never a component and never a type in `types/`.
 */
export const mockDb = {
  auth: authMock,
  customers: customersMock,
  products: productsMock,
  categories: categoriesMock,
  couriers: couriersMock,
  orders: ordersMock,
};

export type { MockDatabase } from "./seed";
export type { Category } from "./types";
export { delay, READ_LATENCY_MS } from "./utils";
export {
  READ_FAILURE_MESSAGE,
  setFailReads,
  shouldFailRead,
} from "./faults";
