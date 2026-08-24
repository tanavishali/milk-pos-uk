import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@services/api/baseApi";
import { authReducer } from "./slices/authSlice";
import { uiReducer } from "./slices/uiSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      ui: uiReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
