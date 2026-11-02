import { studioAiModels, studioAiUpstream } from "@/lib/studio-ai";

// Proxy for AG Studio's Responses-API adapter (components/studio/openai-adapter.ts). The browser POSTs to
// /api/ai/responses; this adds the server's key, pins the model to the allow-list, caps output and streams the
// SSE reply straight back. The key is never logged or returned.
const MAX_OUTPUT_TOKENS = 8_000;
const error = (status: number, message: string) => Response.json({ error: { message } }, { status });

export async function POST(request: Request) {
  const upstream = studioAiUpstream();
  if (!upstream) return error(503, "The AI analyst is not configured: set NEBIUS_API_KEY (or OPENAI_API_KEY) on the server.");
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return error(400, "Request body must be JSON."); }

  const models = studioAiModels();
  const model = typeof body.model === "string" && body.model ? body.model : models[0];
  if (!models.includes(model)) return error(400, `Model "${model}" is not enabled.`);
  // Instruct models on Nebius reject OpenAI reasoning params.
  if (!upstream.reasoning) {
    delete body.reasoning;
    // Nebius validates the Responses schema strictly: drop reasoning items and
    // give replayed tool calls / assistant messages the id it requires.
    if (Array.isArray(body.input)) {
      body.input = body.input
        .filter((it: any) => it?.type !== "reasoning")
        .map((it: any, i: number) => {
          if (!it || typeof it !== "object") return it;
          if (it.type === "function_call") return { ...it, id: it.id || `fc_${it.call_id ?? i}`, status: it.status || "completed" };
          if (it.type === "message" && it.role === "assistant") {
            const content = Array.isArray(it.content)
              ? it.content.map((c: any) => (c?.type === "output_text" && !Array.isArray(c.annotations) ? { ...c, annotations: [] } : c))
              : it.content;
            return { ...it, id: it.id || `msg_${i}`, status: it.status || "completed", content };
          }
          return it;
        });
    }
  }

  const res = await fetch(upstream.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${upstream.key}` },
    body: JSON.stringify({ ...body, model, max_output_tokens: MAX_OUTPUT_TOKENS }),
    signal: request.signal,
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg = j?.error?.message || j?.detail || `AI provider returned ${res.status}`;
    console.warn(`[studio-ai] upstream ${res.status}: ${String(msg).slice(0, 300)}`);
    return error(res.status, String(msg));
  }
  return new Response(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream", "Cache-Control": "no-store" } });
}
