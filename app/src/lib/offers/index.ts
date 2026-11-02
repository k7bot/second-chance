import { rulesEngine } from "./rules";
import { detectProvider, llmEngine } from "./llm";
import type { OfferEngine } from "./types";
export * from "./types";

/** OFFER_ENGINE=rules | llm | auto (default). Pluggable: any OfferEngine works. */
export function getEngine(): OfferEngine {
  const mode = (process.env.OFFER_ENGINE || "auto").toLowerCase();
  if (mode === "rules") return rulesEngine;
  const p = detectProvider();
  return p ? llmEngine(p) : rulesEngine;
}
export function engineLabel(): string {
  const e = getEngine();
  return e.name === "rules" ? "Rules engine (no AI key)" : `AI · ${e.name.replace("llm:", "")}`;
}
