import { detectProvider } from "./offers/llm";

/** Shared server-side LLM access for the dashboard's AI features. The key stays on the server and is never logged. */
export function aiProvider() {
  return detectProvider();
}

export async function chatJson<T = any>(system: string, user: string, opts: { model?: string; maxTokens?: number; timeoutMs?: number } = {}): Promise<T> {
  const p = aiProvider();
  if (!p) throw new Error("No AI key configured");
  const r = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 20000),
    headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model || p.model, temperature: 0.1, max_tokens: opts.maxTokens ?? 1500,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!r.ok) throw new Error(`AI provider returned ${r.status}`);
  const j = await r.json();
  const text: string = j.choices?.[0]?.message?.content ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI reply was not JSON");
  return JSON.parse(m[0]) as T;
}
