import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@app-types/index";
import { clearSession, writeSession } from "@features/auth/utils/session";

interface AuthState {
  user: AuthUser | null;
}

/**
 * Client-side session flag. **Not a security boundary** — `user !== null` proves
 * nothing server-side, and every route is still statically rendered. It exists
 * so the shell knows who is at the till and can show a way out.
 *
 * Starts empty on both server and client so the two agree at hydration; the
 * stored session is restored by `SessionLoader` once mounted.
 */
const initialState: AuthState = { user: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Reducers stay pure in the Redux sense — the storage write is a deliberate
    // side effect kept here so signing in and persisting can never diverge.
    signIn(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      writeSession(action.payload);
    },
    /** Restores a session already on disk; does not re-write it. */
    restoreSession(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    signOut(state) {
      state.user = null;
      clearSession();
    },
  },
});

export const { signIn, restoreSession, signOut } = authSlice.actions;
export const authReducer = authSlice.reducer;
