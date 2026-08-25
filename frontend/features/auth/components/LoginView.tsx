"use client";

import { LuEye, LuEyeOff, LuLogIn, LuShieldCheck } from "react-icons/lu";
import { useState } from "react";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import {
  APP_NAME,
  APP_TAGLINE,
  DEMO_COURIER,
  DEMO_CREDENTIALS,
} from "@constants/index";
import { useAppDispatch } from "@store/hooks";
import { signIn } from "@store/slices/authSlice";
import { useSignInMutation } from "../api/authApi";

export function LoginView() {
  const dispatch = useAppDispatch();
  const [submit, { isLoading }] = useSignInMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const onSubmit = async () => {
    setError(undefined);
    try {
      const user = await submit({ email, password }).unwrap();
      // The guard watches Redux, so dispatching is what performs the redirect.
      dispatch(signIn(user));
    } catch (reason) {
      setError(
        typeof reason === "string" ? reason : "Could not sign in. Try again.",
      );
    }
  };

  const fill = (pair: { email: string; password: string }) => {
    setEmail(pair.email);
    setPassword(pair.password);
    setError(undefined);
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — the app's navy identity, on the half of the screen a
          login form does not need. Hidden below `lg`, where it would just push
          the form off the fold. */}
      <aside className="bg-chrome hidden flex-col justify-between p-10 lg:flex lg:w-[42%] xl:w-[38%]">
        <div>
          <p className="text-chrome-foreground text-2xl font-extrabold tracking-wider">
            {APP_NAME}
          </p>
          <p className="text-chrome-foreground-muted text-micro font-medium tracking-widest uppercase">
            {APP_TAGLINE}
          </p>
        </div>

        <div className="space-y-3">
          <h1 className="text-chrome-foreground text-2xl leading-tight font-extrabold">
            Point of sale,
            <br />
            inventory and dispatch
            <br />
            <span className="text-chrome-accent">in one terminal.</span>
          </h1>
          <p className="text-chrome-foreground-muted max-w-sm text-xs">
            Issue bills, assign couriers, and keep master items and customer
            records straight — from the till or from a phone.
          </p>
        </div>

        <p className="text-chrome-foreground-muted text-nano">
          &copy; {APP_NAME} — terminal build
        </p>
      </aside>

      {/* Form panel */}
      <main className="bg-background flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-sm">
          {/* Brand repeats here for the mobile layout, where the panel is gone. */}
          <div className="mb-6 lg:hidden">
            <p className="text-foreground-strong text-xl font-extrabold tracking-wider">
              {APP_NAME}
            </p>
            <p className="text-foreground-subtle text-nano font-medium tracking-widest uppercase">
              {APP_TAGLINE}
            </p>
          </div>

          <div className="bg-surface border-border rounded-card border p-5 shadow-card sm:p-6">
            <h2 className="text-foreground-strong text-sm font-extrabold">
              Sign in
            </h2>
            <p className="text-foreground-subtle mt-0.5 text-xs">
              Managers get the full terminal; drivers get their own deliveries.
            </p>

            <form
              className="mt-4 space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onSubmit();
              }}
            >
              <FormField label="Email address" htmlFor="login-email" required>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@blanksys.pos"
                  className={inputClass(undefined, error !== undefined)}
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password" required>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className={inputClass("pr-9", error !== undefined)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="text-foreground-subtle hover:text-foreground-body absolute inset-y-0 right-2.5 flex items-center transition-colors"
                  >
                    {showPassword ? (
                      <LuEyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <LuEye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </FormField>

              {error ? (
                <p
                  role="alert"
                  className="bg-danger-soft text-danger-text border-danger-ring rounded-control border px-3 py-2 text-xs font-semibold"
                >
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                icon={LuLogIn}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>

          {/* On screen deliberately: this is a prototype with hard-coded
              accounts and no way to register. Two roles, so two pairs. */}
          <div className="border-accent-ring bg-accent-soft rounded-card mt-3 border p-3">
            <p className="text-accent-text text-micro flex items-center gap-1.5 font-bold uppercase">
              <LuShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Demo accounts
            </p>

            <div className="mt-2 space-y-2">
              {[
                {
                  role: "Manager",
                  blurb: "Full terminal",
                  pair: DEMO_CREDENTIALS,
                },
                {
                  role: "Driver",
                  blurb: "Own deliveries only",
                  pair: DEMO_COURIER,
                },
              ].map((account) => (
                <div
                  key={account.role}
                  className="bg-surface border-border rounded-control border p-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-foreground-strong text-xs font-bold">
                      {account.role}
                    </p>
                    <p className="text-foreground-subtle text-nano">
                      {account.blurb}
                    </p>
                  </div>
                  <p className="text-foreground-body mt-1 font-mono text-[11px] wrap-break-word">
                    {account.pair.email}
                  </p>
                  <p className="text-foreground-body font-mono text-[11px]">
                    {account.pair.password}
                  </p>
                  <button
                    type="button"
                    onClick={() => fill(account.pair)}
                    className="text-accent-text text-micro mt-1.5 font-bold underline underline-offset-2"
                  >
                    Use this account
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
