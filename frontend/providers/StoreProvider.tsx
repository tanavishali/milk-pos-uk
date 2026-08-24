"use client";

import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@store/index";

/**
 * One store per browser session. Created by a lazy `useState` initialiser rather
 * than at module scope, so a server render never shares a store between two
 * requests — and rather than a ref, which cannot be read during render.
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);

  return <Provider store={store}>{children}</Provider>;
}
