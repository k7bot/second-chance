// Studio widget catalogue: every built-in widget plus our custom "Save flow" Sankey, listed first in its
// own menu group so it is one click away in edit mode (and discoverable by Studio's AI agents).
import { createWidgets } from "ag-studio-react";
import type { AgBaseRegistry, AgDefaultWidgetDefinition, AgWidgetsConfig } from "ag-studio";
import type { AgWidgetDefinition } from "ag-studio-react";
import { SaveFlowSankey } from "./sankey-widget";

type SankeyData = { dataMapping: { from: unknown; to: unknown; value: unknown }; format: Record<string, unknown> };
type SankeyDef = AgWidgetDefinition<"save-flow-sankey", any, any>;
export interface StudioRegistry extends AgBaseRegistry {
  widgets: readonly (AgDefaultWidgetDefinition | SankeyDef)[];
}
export type { SankeyData };

const SANKEY_ICON = { url: "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'><path d='M3 5h3c6 0 6 6 12 6h3M3 12h3c6 0 6-1 12-1M3 19h3c6 0 6-8 12-8'/></svg>`,
), mask: true };

export const buildWidgets = (widgetConfig: AgWidgetsConfig) =>
  createWidgets<any>({
    additionalTypes: [
      {
        id: "save-flow-sankey",
        label: "Save flow (Sankey)",
        icon: SANKEY_ICON,
        dataMapping: {
          from: { type: "field", supportedRoles: ["category"], requires: { cardinality: "one" }, required: true, aiDescription: "First stage, e.g. the offer trigger." },
          to: { type: "field", supportedRoles: ["category"], requires: { cardinality: "many" }, required: true, aiDescription: "Following stages in order, e.g. offer kind then outcome." },
          value: { type: "field", supportedRoles: ["numeric"], requires: { cardinality: "one" }, required: true, aiDescription: "Link width, e.g. offer count or MRR saved." },
        },
        form: (p: any) => p.createDefaults({ dataMappingItems: [{ key: "from", label: "From" }, { key: "to", label: "Then" }, { key: "value", label: "Width" }] }),
        comp: SaveFlowSankey,
        defaultSize: { width: 12, height: 18 },
        minSize: { width: 6, height: 10 },
        ai: {
          label: "Save flow Sankey",
          description: "A Sankey diagram showing how members flow through ordered categorical stages (e.g. trigger → offer → outcome), with link width set by a numeric measure. Clicking a node cross-filters the page.",
          usage: "Use for retention flow questions: which triggers lead to which offers, and which offers end in saves or churn.",
        },
      } as any,
    ],
    menu: [{ label: "Second Chance", widgetIds: ["save-flow-sankey"] }, ...widgetConfig.menu] as any,
  }) as any;
