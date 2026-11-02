import type { OfferContext, OfferDecision, OfferEngine } from "./types";
import { GUARDRAILS } from "./types";

const money = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
const round = (n: number) => Math.round(n * 100) / 100;

/** Deterministic fallback. Always available, so the hosted demo works without AI keys. */
export const rulesEngine: OfferEngine = {
  name: "rules",
  async decide(ctx: OfferContext): Promise<OfferDecision> {
    const s = ctx.subscriber;
    const name = s.firstName || "there";
    const tenure = s.tenureMonths;
    const loyal = tenure >= 6;
    const half = round(s.priceMonthly * 0.5);
    const d = (x: Omit<OfferDecision, "engine">): OfferDecision => ({ ...x, engine: "rules" });

    switch (ctx.trigger) {
      case "payment_failed":
        return d({
          kind: "recovery",
          months: 0,
          headline: "Your last payment didn't go through",
          message: `Hi ${name}, your ${s.planName} payment didn't go through, which happens to all of us. Your classes stay open for 7 more days. Update your PayPal payment method and you won't miss a single session.`,
          rationale: `A failed payment is usually involuntary churn. Lead with a grace period, not a discount (attempt ${s.failedPayments}).`,
        });
      case "suspended":
        return loyal
          ? d({
              kind: "comeback", priceMonthly: half, months: 1,
              headline: "Come back, and your next month is half price",
              message: `Hi ${name}, your ${s.planName} membership is on hold. You've practised with us for ${tenure} months, so pick up where you left off and your next month is ${money(half)}.`,
              rationale: `Suspended, loyal member (${tenure} mo): reactivate with a one-month 50% sweetener.`,
            })
          : d({
              kind: "comeback", months: 0,
              headline: "Your mat is waiting",
              message: `Hi ${name}, your membership is paused. One tap brings it back exactly as you left it: same plan, same price, no setup.`,
              rationale: "Suspended, newer member: a frictionless reactivation without a discount.",
            });
      case "paypal_cancelled":
        if (tenure >= 3)
          return d({
            kind: "winback", priceMonthly: 0, months: 1,
            headline: "Your first month back is on us",
            message: `Hi ${name}, we're sorry to see you go. After ${tenure} months together, we'd love another chance: rejoin and your first month is free, then ${money(s.priceMonthly)}/month. Cancel anytime.`,
            rationale: `Cancelled inside PayPal after ${tenure} months. High lifetime value, so a free month is worth it.`,
          });
        return d({
          kind: "winback", priceMonthly: round(s.priceMonthly * 0.6), months: 3,
          headline: "40% off if you rejoin this week",
          message: `Hi ${name}, we noticed you cancelled. If it was the price, rejoin now for ${money(round(s.priceMonthly * 0.6))}/month for 3 months.`,
          rationale: "Cancelled inside PayPal with short tenure. A moderate discount is cheaper than a free month.",
        });
      case "merchant_cancel":
      default: {
        const r = ctx.reason;
        if (r === "taking_break" || (r === "not_using" && tenure >= 2))
          return d({
            kind: "pause", months: 1,
            headline: "Pause instead of cancelling?",
            message: `Hi ${name}, life gets busy. Pause your membership for a month instead: no charge, your history stays, and it picks back up on its own.`,
            rationale: `Reason "${r}" signals temporary disuse. A pause keeps the relationship at zero cost.`,
          });
        if (r === "too_expensive")
          return loyal
            ? d({
                kind: "discount", priceMonthly: half, months: 3,
                headline: "How about half price for 3 months?",
                message: `Hi ${name}, you've been with us ${tenure} months and we'd hate to lose you over price. Stay for ${money(half)}/month for the next 3 months, then back to ${money(s.priceMonthly)}.`,
                rationale: `Price-sensitive, loyal (${tenure} mo): a time-boxed 50% discount protects long-term value.`,
              })
            : d({
                kind: "downgrade", priceMonthly: GUARDRAILS.litePrice,
                headline: `Switch to Lite for ${money(GUARDRAILS.litePrice)}/month`,
                message: `Hi ${name}, Lite keeps the on-demand library and two live classes a week for ${money(GUARDRAILS.litePrice)}/month. You can upgrade again whenever you like.`,
                rationale: "Price-sensitive, newer member: a permanent cheaper tier beats a temporary discount.",
              });
        if (r === "switching" || (r === "missing_features" && tenure < 2))
          return d({
            kind: "let_go",
            headline: "Thanks for practising with us",
            message: `Hi ${name}, thank you for giving Brightside a try. Your feedback goes straight to our teachers. The door's always open.`,
            rationale: `Reason "${r}" with low save probability. Let go gracefully and protect the brand rather than push.`,
          });
        if (r === "technical")
          return d({
            kind: "pause", months: 1,
            headline: "Let us fix it, and pause free meanwhile",
            message: `Hi ${name}, sorry about the trouble. Our team will reach out today. Meanwhile we'll pause your billing for a month so you don't pay for anything that isn't working.`,
            rationale: "A technical issue is fixable. Pause to remove billing pressure while support follows up.",
          });
        return d({
          kind: "discount", priceMonthly: round(s.priceMonthly * 0.7), months: 2,
          headline: "Stay for 30% off",
          message: `Hi ${name}, before you go: stay for ${money(round(s.priceMonthly * 0.7))}/month for the next 2 months while we earn your practice back.`,
          rationale: "Unclear reason: a light, time-boxed discount.",
        });
      }
    }
  },
};
