"use client";

import { useEffect } from "react";
import { reportError } from "@utils/libs/reportError";

/**
 * The root layout itself failed. Renders its own <html>/<body> because the
 * layout that would normally provide them is what broke.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  // The one failure with no other trace, so it must report its argument.
  useEffect(() => reportError(error, "app/global-error"), [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f0f3f8",
          color: "#1e293b",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 14, fontWeight: 800 }}>Application error</h1>
          <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            Reload the page to continue.
          </p>
        </div>
      </body>
    </html>
  );
}
