// AG Studio theme matched to the Second Chance look (and to the Quartz params the AG Grid pages use):
// warm stone canvas, white rounded cards, teal accent, Geist type, the same chart palette.
import { studioTheme } from "ag-studio";
import { PALETTE } from "@/components/grid/ag-setup";

const FONT = "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif";
const line = (color: string) => ({ width: 1, color });
const palette = Object.fromEntries(
  Array.from({ length: 10 }, (_, i) => { const c = PALETTE[i % PALETTE.length]; return [[`chartPaletteFills${i + 1}Color`, c], [`chartPaletteStrokes${i + 1}Color`, c]]; }).flat(),
);

export const secondChanceStudioTheme = studioTheme.withParams({
  fontFamily: FONT, fontSize: 13, textColor: "#0f172a", foregroundColor: "#0f172a", subtleTextColor: "#64748b",
  backgroundColor: "#ffffff", borderColor: "#e7e5e4", accentColor: "#0f766e", iconColor: "#334155", rowHoverColor: "#f6faf9",

  studioWrapperBorder: false, studioWrapperBorderRadius: 0, studioWrapperSpacing: 0, studioWrapperBackgroundColor: "#f6f5f2",
  studioCanvasBorder: false, studioCanvasBorderRadius: 0, studioCanvasShadow: false, studioCanvasBackgroundColor: "#f6f5f2",
  studioCanvasPadding: 8, studioCanvasRowHeight: 18, studioCanvasFontFamily: FONT,

  studioWidgetBackgroundColor: "#ffffff", studioWidgetBorder: line("#e7e5e4"), studioWidgetBorderRadius: 16, studioWidgetPadding: 12,
  studioWidgetTitleFontFamily: FONT, studioWidgetTitleFontSize: 14, studioWidgetTitleFontWeight: 600, studioWidgetTitleTextColor: "#0f172a",
  studioWidgetSubtitleFontFamily: FONT, studioWidgetSubtitleFontSize: 12, studioWidgetSubtitleTextColor: "#64748b",
  studioWidgetCaptionFontFamily: FONT, studioWidgetCaptionFontSize: 12, studioWidgetCaptionTextColor: "#64748b",
  studioWidgetResizeBorderColor: "#0f766e",

  studioPanelContainerBackgroundColor: "#ffffff", studioPanelContainerBorder: line("#e7e5e4"), studioPanelContainerBorderRadius: 16,
  studioPanelDividerColor: "#e7e5e4", studioPanelDividerActiveColor: "#0f766e", studioPanelSectionBorderColor: "#e7e5e4",
  studioPanelHeaderFontFamily: FONT, studioPanelHeaderFontWeight: 600,
  studioPanelChevronButtonHoverBackgroundColor: "#e6f4f1", studioPanelChevronButtonHoverColor: "#0f766e",
  studioToggleButtonActiveBackgroundColor: "#e6f4f1", studioToggleButtonActiveBorderColor: "#0f766e", studioToggleButtonActiveColor: "#0f766e",

  gridFontFamily: FONT, gridFontSize: 13, gridCellTextColor: "#0f172a", gridHeaderBackgroundColor: "#fafaf9", gridHeaderTextColor: "#64748b",
  gridHeaderFontWeight: 600, gridHeaderFontSize: 12, gridRowHeight: 38, gridRowBorder: line("#f0eeeb"), gridHeaderRowBorder: line("#e7e5e4"),
  gridPinnedRowBorder: line("#e7e5e4"), gridRowHoverColor: "#f6faf9", gridWrapperBorder: false,

  chartFontFamily: FONT, chartTextColor: "#0f172a", chartSubtleTextColor: "#64748b", chartAxisLineColor: "#e7e5e4", chartGridLineColor: "#f0eeeb",
  ...palette,
});
