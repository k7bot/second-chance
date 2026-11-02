export type Trigger = "merchant_cancel" | "payment_failed" | "suspended" | "paypal_cancelled";
export type OfferKind = "pause" | "discount" | "downgrade" | "winback" | "recovery" | "comeback" | "let_go";
export type CancelReason = "too_expensive" | "not_using" | "taking_break" | "missing_features" | "technical" | "switching" | "other";

export const REASONS: { id: CancelReason; label: string; hint: string }[] = [
  { id: "too_expensive", label: "It's too expensive", hint: "Money's tight right now" },
  { id: "not_using", label: "I'm not using it enough", hint: "Life got busy" },
  { id: "taking_break", label: "Taking a break", hint: "Travel, injury, a busy season" },
  { id: "missing_features", label: "Missing something I need", hint: "Classes, levels, styles" },
  { id: "technical", label: "Technical problems", hint: "Video, app or billing issues" },
  { id: "switching", label: "Switching to another studio", hint: "Found something else" },
  { id: "other", label: "Something else", hint: "Tell us in your own words" },
];

export interface OfferContext {
  trigger: Trigger;
  subscriber: {
    firstName: string;
    planName: string;
    priceMonthly: number;
    tenureMonths: number;
    failedPayments: number;
    status: string;
    priorSaves: number;
  };
  reason?: CancelReason;
  reasonText?: string;
  /** Hashed visitor key for the LLM spend guard. Never sent to the model. */
  clientKey?: string;
}

export interface OfferDecision {
  kind: OfferKind;
  /** New monthly price for discount / downgrade / winback (custom price via plan override). */
  priceMonthly?: number;
  /** Duration of a discount, pause or free period, in months. */
  months?: number;
  headline: string;
  message: string;
  rationale: string;
  engine: string;
}

export interface OfferEngine {
  name: string;
  decide(ctx: OfferContext): Promise<OfferDecision>;
}

/** Merchant guardrails: the AI may only choose within these bounds. */
export const GUARDRAILS = {
  minPriceFraction: 0.4, // never below 40% of list price
  maxDiscountMonths: 6,
  maxPauseMonths: 3,
  litePrice: 15,
  allowed: {
    merchant_cancel: ["pause", "discount", "downgrade", "let_go"],
    payment_failed: ["recovery"],
    suspended: ["comeback"],
    paypal_cancelled: ["winback", "let_go"],
  } as Record<Trigger, OfferKind[]>,
};
