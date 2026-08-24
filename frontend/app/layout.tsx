import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { APP_NAME } from "@constants/index";
import { AppProviders } from "@providers/index";
import "./globals.css";

/**
 * Self-hosted by next/font, exposed as the CSS variable that `--font-sans` in
 * globals.css points at — so the whole app picks it up through the token rather
 * than by naming the family anywhere else.
 */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

/** Headings and figures. Paired with Plus Jakarta for body copy. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Point of Sales & ERP`,
    template: `%s | ${APP_NAME}`,
  },
  description: "Point of sale, inventory and dispatch management.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
