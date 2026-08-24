import { APP_NAME, APP_TAGLINE } from "@constants/index";

/**
 * Shown while a guard decides. Uses the navy chrome rather than a blank page so
 * the moment reads as the app starting up, not as a failed render.
 */
export function RouteSplash() {
  return (
    <div className="bg-chrome flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="text-center">
        <p className="text-chrome-foreground text-lg font-extrabold tracking-wider">
          {APP_NAME}
        </p>
        <p className="text-chrome-foreground-muted text-[9px] font-medium tracking-widest uppercase">
          {APP_TAGLINE}
        </p>
      </div>
      <span
        role="status"
        aria-label="Loading"
        className="border-chrome-accent h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
      />
    </div>
  );
}
