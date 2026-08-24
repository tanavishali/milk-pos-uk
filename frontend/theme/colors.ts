/**
 * Raw hex mirror of the palette in `app/globals.css`.
 *
 * Tailwind utilities are the way to reach these values in markup. This module
 * exists for the cases where JS needs the raw string — a `<canvas>`, an SVG
 * chart library that takes `fill`/`stroke` props, a `<meta name="theme-color">`.
 *
 * Every key here must exist in `globals.css` with the same value. Keep the two
 * in sync; a drift shows up as a chart that is quietly off-brand.
 */

export const lightColors = {
  background: "#f5f6f8",

  surface: "#ffffff",
  surfaceMuted: "#f6f7f9",
  surfaceSubtle: "#f0f1f3",
  surfaceInset: "#e6e8ec",

  chrome: "#14171a",
  chromeHover: "#1d2127",
  chromeForeground: "#ffffff",
  chromeForegroundMuted: "#6b7280",
  chromeBorder: "#232730",
  chromeAccent: "#0f8a6b",

  foregroundStrong: "#14171a",
  foreground: "#14171a",
  foregroundBody: "#3f4451",
  foregroundMuted: "#6b7280",
  foregroundSubtle: "#8a9099",
  foregroundOnAccent: "#ffffff",

  border: "#e6e8ec",
  borderSubtle: "#f0f1f3",
  borderStrong: "#d6dbe0",
  borderInput: "#e6e8ec",
  borderFocus: "#0f8a6b",

  accent: "#0f8a6b",
  accentHover: "#0c7259",
  accentSoft: "#e7f5ef",
  accentMuted: "#d3ece2",
  accentRing: "#b7dfd0",
  accentText: "#0f8a6b",

  success: "#15803d",
  successHover: "#166534",
  successSoft: "#e7f5ef",
  successMuted: "#d3ece2",
  successRing: "#b7dfd0",
  successText: "#15803d",

  danger: "#dc2626",
  dangerHover: "#b91c1c",
  dangerSoft: "#fdecec",
  dangerMuted: "#fbdada",
  dangerRing: "#f6c2c2",
  dangerText: "#b91c1c",

  warning: "#d97706",
  warningHover: "#b45309",
  warningSoft: "#fef3c7",
  warningMuted: "#fde8a6",
  warningRing: "#fcd97d",
  warningText: "#b45309",

  info: "#2563eb",
  infoHover: "#1d4ed8",
  infoSoft: "#eaf1ff",
  infoMuted: "#d7e5ff",
  infoRing: "#b9d2ff",
  infoText: "#2563eb",
} as const;

export const darkColors = {
  background: "#020617",

  surface: "#0f172a",
  surfaceMuted: "#1e293b",
  surfaceSubtle: "#1e293b",
  surfaceInset: "#334155",

  chrome: "#0d0f11",
  chromeHover: "#1e293b",
  chromeForeground: "#f8fafc",
  chromeForegroundMuted: "#94a3b8",
  chromeBorder: "#1e293b",
  chromeAccent: "#14b892",

  foregroundStrong: "#f8fafc",
  foreground: "#e2e8f0",
  foregroundBody: "#cbd5e1",
  foregroundMuted: "#94a3b8",
  foregroundSubtle: "#64748b",
  foregroundOnAccent: "#ffffff",

  border: "#1e293b",
  borderSubtle: "#172033",
  borderStrong: "#334155",
  borderInput: "#334155",
  borderFocus: "#14b892",

  accent: "#14b892",
  accentHover: "#34d3ad",
  accentSoft: "#0f8a6b1f",
  accentMuted: "#0f8a6b33",
  accentRing: "#0f8a6b40",
  accentText: "#34d3ad",

  success: "#00c980",
  successHover: "#34d399",
  successSoft: "#00c9801f",
  successMuted: "#00c98033",
  successRing: "#00c98040",
  successText: "#34d399",

  danger: "#f43f5e",
  dangerHover: "#fb7185",
  dangerSoft: "#f43f5e1f",
  dangerMuted: "#f43f5e33",
  dangerRing: "#f43f5e40",
  dangerText: "#fb7185",

  warning: "#f59e0b",
  warningHover: "#fbbf24",
  warningSoft: "#f59e0b1f",
  warningMuted: "#f59e0b33",
  warningRing: "#f59e0b40",
  warningText: "#fbbf24",

  info: "#8b5cf6",
  infoHover: "#a78bfa",
  infoSoft: "#7c3aed1f",
  infoMuted: "#7c3aed33",
  infoRing: "#7c3aed40",
  infoText: "#a78bfa",
} as const;

/**
 * Categorical series colours, in the order a chart should consume them.
 * Index 0 is the brand blue, so a single-series chart is on-brand by default.
 */
export const lightChartColors = {
  series: ["#0f8a6b", "#2563eb", "#d97706", "#7c3aed", "#0ea5e9", "#dc2626"],
  grid: "#f0f1f3",
  axis: "#8a9099",
} as const;

export const darkChartColors = {
  series: ["#34d3ad", "#34d399", "#fbbf24", "#a78bfa", "#38bdf8", "#fb7185"],
  grid: "#1e293b",
  axis: "#64748b",
} as const;

export type ColorToken = keyof typeof lightColors;
export type ColorScheme = "light" | "dark";

/** Resolve the palette for a scheme. */
export function colorsFor(scheme: ColorScheme) {
  return scheme === "dark" ? darkColors : lightColors;
}

export function chartColorsFor(scheme: ColorScheme) {
  return scheme === "dark" ? darkChartColors : lightChartColors;
}

/** Nth series colour, wrapping when a chart has more series than the palette. */
export function seriesColor(index: number, scheme: ColorScheme = "light") {
  const { series } = chartColorsFor(scheme);
  return series[index % series.length];
}
