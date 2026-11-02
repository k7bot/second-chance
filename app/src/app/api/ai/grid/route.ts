import { chatJson, aiProvider } from "@/lib/ai";
import { AI_RESTING, clientKey, llmBudget } from "@/lib/guard";

/**
 * AG Grid AI Toolkit backend. The browser sends the grid's structured schema (api.getStructuredSchema),
 * its current state and a few sample rows; the model answers with a GridState for api.setState().
 */
export async function POST(req: Request) {
  if (!aiProvider()) return Response.json({ error: "No AI key is configured on the server." }, { status: 503 });
  const { prompt, context, state, schema, sample } = await req.json();
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 500) return Response.json({ error: "Ask a short question." }, { status: 400 });
  if (!(await llmBudget(clientKey(req.headers))).ok) return Response.json({ error: AI_RESTING }, { status: 429, headers: { "Retry-After": "600" } });
  const system = `You are an expert data analyst driving an AG Grid data grid for a subscription retention dashboard.
${context}
Turn the user's request into grid state. Reply with JSON only, shaped exactly:
{"gridState": <object matching GRID_STATE_SCHEMA>, "propertiesToIgnore": [<grid state keys you did not change>], "explanation": "<one short sentence, plain English, for the merchant>"}
Rules:
- Include every requested change, and keep features already applied that the user did not ask to change (copy them from CURRENT_STATE).
- When the user asks for a fresh view, clear unrelated filters and grouping.
- Set filter values must come from the allowed values in the schema. Use real column ids only.
- Valid keys for propertiesToIgnore: aggregation, filter, sort, pivot, columnVisibility, columnSizing, rowGroup.
- Money values are USD numbers. Today is ${new Date().toISOString().slice(0, 10)}.

GRID_STATE_SCHEMA:
${JSON.stringify(schema)}`;
  const user = `CURRENT_STATE:\n${JSON.stringify({ rowGroup: state?.rowGroup, filter: state?.filter, sort: state?.sort, aggregation: state?.aggregation, pivot: state?.pivot, columnVisibility: state?.columnVisibility })}\n\nSAMPLE_ROWS:\n${JSON.stringify((sample ?? []).slice(0, 3)).slice(0, 2500)}\n\nREQUEST: ${prompt}`;
  try {
    const out = await chatJson<{ gridState?: any; propertiesToIgnore?: string[]; explanation?: string }>(system, user, { maxTokens: 1200, timeoutMs: 25000 });
    const allowed = ["aggregation", "filter", "sort", "pivot", "columnVisibility", "columnSizing", "rowGroup"];
    const ignore = (out.propertiesToIgnore ?? []).filter((k) => allowed.includes(k));
    // Never let the model touch layout-ish state we don't send it.
    const extra = ["columnOrder", "columnPinning", "columnGroup", "columnHeaderName", "focusedCell", "pagination", "rowPinning", "cellSelection", "rowSelection", "scroll", "sideBar", "showValuesAs", "quickFilter", "rowGroupExpansion"];
    return Response.json({ gridState: out.gridState ?? {}, propertiesToIgnore: [...new Set([...ignore, ...extra])], explanation: out.explanation ?? "Updated the view." });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
