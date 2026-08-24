import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { ViewMode } from "@enums/index";

/** Registries that carry a grid/list preference. */
export type ViewModeKey = "customers" | "products" | "couriers" | "orders";

interface UiState {
  mobileSidebarOpen: boolean;
  /**
   * Set by the mobile tab bar's centre button, which has to navigate to the
   * orders page *and* open the wizard there. A flag in the store rather than a
   * `?new=1` query param: the param would survive a back-navigation and reopen
   * the wizard, and clearing it would need an effect.
   */
  newOrderRequested: boolean;
  /**
   * Grid/list per registry, kept here rather than in each view so the choice
   * survives navigating away and back — matching the source app, where these
   * lived in one module-level object.
   */
  viewModes: Record<ViewModeKey, ViewMode>;
}

const initialState: UiState = {
  mobileSidebarOpen: false,
  newOrderRequested: false,
  viewModes: {
    customers: ViewMode.List,
    products: ViewMode.Grid,
    couriers: ViewMode.List,
    orders: ViewMode.List,
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setMobileSidebarOpen(state, action: PayloadAction<boolean>) {
      state.mobileSidebarOpen = action.payload;
    },
    toggleMobileSidebar(state) {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
    setViewMode(
      state,
      action: PayloadAction<{ key: ViewModeKey; mode: ViewMode }>,
    ) {
      state.viewModes[action.payload.key] = action.payload.mode;
    },
    requestNewOrder(state) {
      state.newOrderRequested = true;
    },
    clearNewOrderRequest(state) {
      state.newOrderRequested = false;
    },
  },
});

export const {
  setMobileSidebarOpen,
  toggleMobileSidebar,
  setViewMode,
  requestNewOrder,
  clearNewOrderRequest,
} = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
