import type { Customer, CustomerDraft } from "@app-types/index";
import { db } from "./seed";
import { assertUniqueId, clone, nextId } from "./utils";

export const customersMock = {
  list(): Customer[] {
    return clone(db.customers);
  },

  find(id: string): Customer | undefined {
    return clone(db.customers.find((c) => c.id === id));
  },

  create(draft: CustomerDraft): Customer {
    const id = nextId("CUST", db.customers);
    assertUniqueId("customers", id, db.customers);
    const created: Customer = { id, ...draft };
    // Newest first, so a record you just added is on the page you are looking at.
    db.customers.unshift(created);
    return clone(created);
  },

  update(id: string, draft: CustomerDraft): Customer {
    const index = db.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Customer ${id} not found`);
    const updated: Customer = { id, ...draft };
    db.customers[index] = updated;
    return clone(updated);
  },

  remove(id: string): string {
    db.customers = db.customers.filter((c) => c.id !== id);
    return id;
  },
};
