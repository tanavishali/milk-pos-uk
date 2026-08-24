import type { Courier, CourierDraft } from "@app-types/index";
import { db } from "./seed";
import { assertUniqueId, clone, nextId } from "./utils";

export const couriersMock = {
  list(): Courier[] {
    return clone(db.couriers);
  },

  find(id: string): Courier | undefined {
    return clone(db.couriers.find((c) => c.id === id));
  },

  create(draft: CourierDraft): Courier {
    // `password` is accepted and dropped — nothing reads it back, so storing it
    // would only create somewhere for it to leak from.
    const { password: _password, ...rest } = draft;
    const id = nextId("COUR", db.couriers);
    assertUniqueId("couriers", id, db.couriers);
    const created: Courier = { id, ...rest };
    db.couriers.unshift(created);
    return clone(created);
  },

  update(id: string, draft: CourierDraft): Courier {
    const index = db.couriers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Courier ${id} not found`);
    const { password: _password, ...rest } = draft;
    const updated: Courier = { id, ...rest };
    db.couriers[index] = updated;
    return clone(updated);
  },

  remove(id: string): string {
    db.couriers = db.couriers.filter((c) => c.id !== id);
    return id;
  },
};
