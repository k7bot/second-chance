// AG Studio AI: a custom "Retention analyst" agent that fronts the chat, with two Second Chance tools of its own
// plus Studio's built-in read/query tools, and delegation to AG's built-in page/widget/data agents for building
// dashboards. Every agent talks to the LLM through /api/ai/responses, a server proxy that holds the key.
import { createAiHarness, directLlmRunner, type AgAiHarnessSetup, type AgAiPromptStarter } from "ag-studio";
import { openaiAdapter } from "./openai-adapter";
import type { DashData } from "@/components/grid/data";

const PROMPT_STARTERS: AgAiPromptStarter[] = [
  { label: "Who should I call today?", prompt: "Which at-risk members are worth the most right now, and what would you offer each of them?" },
  { label: "Best offer per trigger", prompt: "For each cancellation trigger, which offer saves the most members and revenue? Give me a short playbook." },
  { label: "Add a chart", prompt: "Add a chart to this page showing MRR saved by week, split by offer type." },
  { label: "Explain this page", prompt: "Summarise what this page shows and what stands out." },
];

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function buildAi(models: string[], getData: () => DashData | null): AgAiHarnessSetup {
  const adapter = openaiAdapter({ endpoint: "/api/ai", model: models[0] });
  return ({ api }) => {
    const atRisk = api.defineAiTool({
      name: "list_at_risk_members",
      description: "Live list of Second Chance members currently at risk of churning or awaiting PayPal consent, highest monthly price first, with why they are at risk and the latest retention offer.",
      params: (s: any) => s.object({ limit: s.number({ description: "How many members to return (1-25)." }).optional() }),
      execute: (args: { limit?: number }, ctx: any) => {
        const d = getData();
        if (!d) return ctx.error("Dashboard data is still loading.");
        const rows = d.subs.filter((s) => s.risk === "at_risk" || s.risk === "pending").sort((a, b) => b.price - a.price)
          .slice(0, Math.min(25, Math.max(1, args.limit ?? 10)))
          .map((s) => ({ name: s.name, plan: s.plan, monthlyPrice: s.price, paypalStatus: s.status, state: s.risk === "pending" ? "awaiting PayPal consent" : "at risk", reason: s.riskReason, failedPayments: s.failedPayments, tenureMonths: s.tenureMonths, paidLast12m: s.paid12m, latestOffer: s.offerKind, latestOfferStatus: s.offerStatus }));
        return ctx.success(JSON.stringify({ count: rows.length, mrrAtStake: money(rows.reduce((a, r) => a + r.monthlyPrice, 0)), members: rows }));
      },
    } as any);
    const playbook = api.defineAiTool({
      name: "retention_playbook",
      description: "Per cancellation trigger, how each offer type has performed historically: offers made, saves, save rate and MRR saved. Use it to recommend which offer to lead with.",
      params: (s: any) => s.object({}),
      execute: (_: unknown, ctx: any) => {
        const d = getData();
        if (!d) return ctx.error("Dashboard data is still loading.");
        const m = new Map<string, { trigger: string; offer: string; offers: number; decided: number; saves: number; mrrSaved: number }>();
        for (const o of d.offers) {
          const k = `${o.trigger}|${o.kind}`;
          const r = m.get(k) ?? { trigger: o.trigger, offer: o.kind, offers: 0, decided: 0, saves: 0, mrrSaved: 0 };
          r.offers++; r.decided += o.decided; r.saves += o.saved; r.mrrSaved += o.mrrSaved; m.set(k, r);
        }
        const rows = [...m.values()].map((r) => ({ ...r, saveRate: r.decided ? Math.round((100 * r.saves) / r.decided) + "%" : "n/a", mrrSaved: money(r.mrrSaved) }))
          .sort((a, b) => a.trigger.localeCompare(b.trigger) || b.saves - a.saves);
        return ctx.success(JSON.stringify(rows));
      },
    } as any);

    return createAiHarness(api, ({ builtIn, tools }) => ({
      primary: "retention",
      promptStarters: PROMPT_STARTERS,
      models: models.length > 1 ? models.map((id) => ({ id, label: id.split("/").pop() ?? id })) : undefined,
      agents: [
        directLlmRunner({
          id: "retention",
          name: "Retention analyst",
          description: "Second Chance's retention analyst for Brightside Yoga.",
          instructions: () =>
            "You are Second Chance's retention analyst for Brightside Yoga, a studio billing members through PayPal Subscriptions. " +
            "Answer like a sharp, friendly analyst: lead with the answer, use concrete names and dollar amounts, keep it under ~150 words unless asked. " +
            "Use list_at_risk_members for who to act on now and retention_playbook for which offer works per trigger. Use execute_query for any other question about the data. " +
            "When the user asks to add, change or arrange widgets, pages or filters on the dashboard, delegate to the right built-in agent. Never invent numbers.",
          tools: () => [
            atRisk, playbook,
            tools.studio.viewSchema(), tools.studio.viewReport(), tools.studio.viewPage(), tools.studio.executeQuery(),
            tools.renameThread(), tools.delegateTo(["page", "widget", "data", "planning"]),
          ],
          maxTurns: 12,
          adapter,
        }),
        ...(["lead", "page", "widget", "data", "planning"] as const).map((id) => directLlmRunner({ ...builtIn[id], adapter })),
      ],
    }));
  };
}
