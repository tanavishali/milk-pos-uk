/**
 * The single seam for unhandled errors. Wiring Sentry/Datadog is a change to
 * this file only.
 */
export function reportError(error: unknown, context?: string) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context ? `[${context}]` : "[error]", error);
  }
}
