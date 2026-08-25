import type { Courier, CourierDraft } from "@app-types/index";
import { COURIER_DEFAULT_PASSWORD } from "@constants/app";
import { credentialsMock } from "./credentials";
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
    // The password goes to the credential store, never onto the row. `Courier`
    // has no password field, so it cannot ride along on a read.
    const { password, ...rest } = draft;
    const id = nextId("COUR", db.couriers);
    assertUniqueId("couriers", id, db.couriers);
    const created: Courier = { id, ...rest };
    db.couriers.unshift(created);
    credentialsMock.set(id, password?.trim() || COURIER_DEFAULT_PASSWORD);
    return clone(created);
  },

  update(id: string, draft: CourierDraft): Courier {
    const index = db.couriers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Courier ${id} not found`);
    const { password, ...rest } = draft;
    const updated: Courier = { id, ...rest };
    db.couriers[index] = updated;
    // Blank means "keep the current one" — the edit form leaves it empty.
    credentialsMock.setIfProvided(id, password);
    return clone(updated);
  },

  remove(id: string): string {
    db.couriers = db.couriers.filter((c) => c.id !== id);
    // Removing the row without the credential would leave a courier able to
    // sign in with no roster entry behind them.
    credentialsMock.remove(id);
    return id;
  },
};
