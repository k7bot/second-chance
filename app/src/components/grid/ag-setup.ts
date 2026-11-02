"use client";
import { ModuleRegistry, themeQuartz, iconSetQuartzLight } from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
import { AgChartsEnterpriseModule, LicenseManager as ChartsLicenseManager } from "ag-charts-enterprise";
import type { AgChartThemeOverrides } from "ag-charts-enterprise";

/**
 * One place for AG Grid / AG Charts Enterprise setup.
 * - Every grid gets all Enterprise features, with AG Charts Enterprise wired in for Integrated Charts and Sparklines.
 * - The licence key is read from NEXT_PUBLIC_AG_GRID_LICENSE_KEY (inlined at build time). Without one, AG shows its
 *   trial watermark and a console notice, and everything still works.
 */
let done = false;
export function ensureAg() {
  if (done) return;
  done = true;
  ModuleRegistry.registerModules([AllEnterpriseModule.with(AgChartsEnterpriseModule)]);
  const key = process.env.NEXT_PUBLIC_AG_GRID_LICENSE_KEY;
  if (key) {
    LicenseManager.setLicenseKey(key);
    ChartsLicenseManager.setLicenseKey(key);
  }
}
ensureAg();

/** Offer-kind colours, shared by grid pills, charts and the Studio palette. */
export const KIND_COLORS: Record<string, string> = {
  Pause: "#0ea5e9", Discount: "#0f766e", "Downgrade to Lite": "#6366f1", "Win-back": "#f97316",
  "Payment recovery": "#10b981", "Come-back": "#f59e0b", "Let go": "#94a3b8",
};
export const PALETTE = ["#0f766e", "#0ea5e9", "#6366f1", "#f97316", "#10b981", "#f59e0b", "#e11d48", "#94a3b8"];

/** Quartz, tuned to the Second Chance look: warm stone lines, teal accent, Geist type, roomy rows. */
export const gridTheme = themeQuartz.withPart(iconSetQuartzLight).withParams({
  accentColor: "#0f766e",
  backgroundColor: "#ffffff",
  foregroundColor: "#0f172a",
  textColor: "#0f172a",
  subtleTextColor: "#64748b",
  borderColor: "#e7e5e4",
  chromeBackgroundColor: "#fafaf9",
  headerBackgroundColor: "#fafaf9",
  headerTextColor: "#64748b",
  headerFontWeight: 600,
  headerFontSize: 12,
  fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  rowHeight: 50,
  headerHeight: 42,
  spacing: 7,
  wrapperBorder: false,
  wrapperBorderRadius: 16,
  borderRadius: 8,
  columnBorder: false,
  rowBorder: { color: "#f0eeeb" },
  rowHoverColor: "#f6faf9",
  selectedRowBackgroundColor: "#e6f4f1",
  rangeSelectionBorderColor: "#0f766e",
  rangeSelectionBackgroundColor: "rgba(15,118,110,0.08)",
  valueChangeValueHighlightBackgroundColor: "rgba(20,184,166,0.28)",
  valueChangeDeltaUpColor: "#059669",
  valueChangeDeltaDownColor: "#e11d48",
  sideBarBackgroundColor: "#fafaf9",
  rowGroupIndentSize: 22,
  iconSize: 15,
  inputFocusBorder: { color: "#0f766e" },
  focusShadow: { radius: 3, spread: 0, color: "rgba(15,118,110,0.35)" },
  menuBackgroundColor: "#ffffff",
  menuShadow: { radius: 24, spread: 0, offsetY: 12, color: "rgba(15,23,42,0.12)" },
  tooltipBackgroundColor: "#0f172a",
  tooltipTextColor: "#ffffff",
});

const geist = typeof document !== "undefined" ? getComputedStyle(document.documentElement).getPropertyValue("--font-geist-sans").trim() : "";
export const CHART_FONT = `${geist ? geist + ", " : ""}ui-sans-serif, system-ui, sans-serif`;

/** AG Charts theme to match (used by standalone charts and the grid's Integrated Charts). */
export const chartThemeOverrides: AgChartThemeOverrides = {
  common: {
    background: { fill: "transparent" },
    padding: { top: 8, right: 8, bottom: 8, left: 8 },
    legend: { item: { label: { fontSize: 12, color: "#334155" } } },
    axes: {
      number: { label: { color: "#64748b", fontSize: 11 }, gridLine: { style: [{ stroke: "#f0eeeb", lineDash: [] }] }, line: { width: 0 } },
      category: { label: { color: "#64748b", fontSize: 11 }, line: { stroke: "#e7e5e4" } },
      time: { label: { color: "#64748b", fontSize: 11 }, line: { stroke: "#e7e5e4" } },
    },
  },
};
export const chartTheme = { baseTheme: "ag-default", params: { fontFamily: CHART_FONT, foregroundColor: "#0f172a" }, palette: { fills: PALETTE, strokes: PALETTE }, overrides: chartThemeOverrides } as const;
