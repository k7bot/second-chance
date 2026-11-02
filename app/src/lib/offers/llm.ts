import type { OfferContext, OfferDecision, OfferEngine, OfferKind } from "./types";
import { GUARDRAILS } from "./types";
import { rulesEngine } from "./rules";
import { llmBudget } from "../guard";

type Provider = { name: string; baseUrl: string; model: string; key: string };

/** OpenAI-compatible chat completions. Pick a provider from env; never logs the key. */
export function detectProvider(): Provider | null {
  const e = process.env;
  const choice = (e.LLM_PROVIDER || "").toLowerCase();
  const table: Record<string, () => Provider | null> = {
    custom: () => (e.LLM_API_KEY && e.LLM_BASE_URL ? { name: "custom", baseUrl: e.LLM_BASE_URL, model: e.LLM_MODEL || "gpt-4o-mini", key: e.LLM_API_KEY } : null),
    openai: () => (e.OPENAI_API_KEY ? { name: "openai", baseUrl: "https://api.openai.com/v1", model: e.LLM_MODEL || "gpt-4o-mini", key: e.OPENAI_API_KEY } : null),
    xai: () => (e.XAI_API_KEY ? { name: "xai", baseUrl: "https://api.x.ai/v1", model: e.LLM_MODEL || "grok-3-mini", key: e.XAI_API_KEY } : null),
    nebius: () => (e.NEBIUS_API_KEY ? { name: "nebius", baseUrl: "https://api.studio.nebius.com/v1", model: e.LLM_MODEL || "Qwen/Qwen3-30B-A3B-Instruct-2507", key: e.NEBIUS_API_KEY } : null),
  };
  if (choice) return table[choice]?.() ?? null;
  // auto: only keys that are explicitly meant for this app
  return table.custom() || table.openai() || table.xai() || table.nebius();
}

const SYSTEM = `You are Second Chance, a retention strategist for a subscription business (Brightside Yoga, an online yoga studio).
Pick ONE offer for this subscriber and write a short, warm, personal message (max 55 words, no emojis, no pressure tactics, first name only).
Guidance by trigger:
- merchant_cancel: the subscriber is on the cancel page right now. "pause" (months 1-3, no price) suits breaks or low usage; "discount" (priceMonthly + months) suits price concerns from loyal members; "downgrade" moves to the Lite plan; "let_go" when a save is unlikely (switching, a bad fit). Address their stated reason directly.
- payment_failed: kind must be "recovery". Reassure them, mention the 7-day grace period and ask them to update their PayPal payment method. No discount.
- suspended: kind must be "comeback". Invite them to reactivate. A one-month price (priceMonthly, months=1) is optional for loyal members.
- paypal_cancelled: "winback" with priceMonthly 0 and months 1 (first month free) for long-tenure members, or a discounted priceMonthly for 1-3 months. Or "let_go".
Respond with JSON only: {"kind": string, "priceMonthly": number|null, "months": number|null, "headline": string (max 8 words), "message": string, "rationale": string (one sentence, for the merchant)}.`;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function llmEngine(p: Provider): OfferEngine {
  return {
    name: `llm:${p.name}`,
    async decide(ctx: OfferContext): Promise<OfferDecision> {
      // Spend guard: over the per-visitor or daily cap, quietly use the rules engine instead.
      const budget = await llmBudget(ctx.clientKey);
      if (!budget.ok) {
        console.info(`[guard] LLM ${budget.why} cap reached, using rules for ${ctx.trigger}`);
        return rulesEngine.decide(ctx);
      }
      const allowed = GUARDRAILS.allowed[ctx.trigger];
      const user = {
        trigger: ctx.trigger,
        allowed_kinds: allowed,
        guardrails: {
          min_price: +(ctx.subscriber.priceMonthly * GUARDRAILS.minPriceFraction).toFixed(2),
          max_discount_months: GUARDRAILS.maxDiscountMonths,
          max_pause_months: GUARDRAILS.maxPauseMonths,
          lite_plan_price: GUARDRAILS.litePrice,
          winback_may_be_free_first_month: true,
        },
        subscriber: ctx.subscriber,
        cancel_reason: ctx.reason,
        cancel_reason_text: ctx.reasonText?.slice(0, 400),
      };
      try {
        const ctl = AbortSignal.timeout(Number(process.env.LLM_TIMEOUT_MS || 8000));
        const r = await fetch(`${p.baseUrl}/chat/completions`, {
          method: "POST",
          signal: ctl,
          headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: p.model,
            temperature: 0.4,
            response_format: { type: "json_object" },
            messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(user) }],
          }),
        });
        if (!r.ok) throw new Error(`LLM HTTP ${r.status}`);
        const j = await r.json();
        const raw = j.choices?.[0]?.message?.content || "";
        const out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        const kind = out.kind as OfferKind;
        if (!allowed.includes(kind)) throw new Error("kind outside guardrails");
        const list = ctx.subscriber.priceMonthly;
        let price: number | undefined = typeof out.priceMonthly === "number" ? out.priceMonthly : undefined;
        if (kind === "downgrade") price = GUARDRAILS.litePrice;
        if (kind === "pause" || kind === "recovery" || kind === "let_go") price = undefined;
        if (price !== undefined && !(kind === "winback" && price === 0)) price = +clamp(price, list * GUARDRAILS.minPriceFraction, list).toFixed(2);
        const maxM = kind === "pause" ? GUARDRAILS.maxPauseMonths : GUARDRAILS.maxDiscountMonths;
        const months = typeof out.months === "number" ? clamp(Math.round(out.months), 0, maxM) : undefined;
        return {
          kind, priceMonthly: price, months,
          headline: String(out.headline || "").slice(0, 80),
          message: String(out.message || "").slice(0, 600),
          rationale: String(out.rationale || "").slice(0, 300),
          engine: `llm:${p.name}:${p.model}`,
        };
      } catch (e) {
        const fb = await rulesEngine.decide(ctx);
        return { ...fb, engine: `rules (llm fallback: ${(e as Error).message})` };
      }
    },
  };
}
