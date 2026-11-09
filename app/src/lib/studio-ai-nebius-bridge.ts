/**
 * Nebius Token Factory: Qwen on /v1/responses accepts tools in the request, but fails with
 * "Unable to process request. Repeat the request later." as soon as it needs to *emit* a
 * function_call. Their own function-calling docs use Chat Completions instead.
 *
 * This bridge converts an AG Studio Responses-API request into chat.completions, then
 * re-emits a Responses-shaped SSE stream that openai-adapter.ts already understands.
 */
type Json = Record<string, unknown>;

const NEBIUS_CHAT = "https://api.tokenfactory.nebius.com/v1/chat/completions";

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((c: any) => {
      if (!c || typeof c !== "object") return "";
      if (typeof c.text === "string") return c.text;
      if (c.type === "input_text" || c.type === "output_text") return c.text || "";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/** Responses `input` (+ optional instructions) → Chat Completions `messages`. */
export function responsesInputToChatMessages(input: unknown[], instructions?: string): Json[] {
  const messages: Json[] = [];
  if (instructions?.trim()) messages.push({ role: "system", content: instructions.trim() });

  let pendingToolCalls: Json[] | null = null;
  const flushTools = () => {
    if (pendingToolCalls?.length) {
      messages.push({ role: "assistant", content: null, tool_calls: pendingToolCalls });
      pendingToolCalls = null;
    }
  };

  for (const raw of input || []) {
    const it = raw as any;
    if (!it || typeof it !== "object") continue;

    if (it.type === "message" && it.role === "user") {
      flushTools();
      messages.push({ role: "user", content: textFromContent(it.content) });
      continue;
    }
    if (it.type === "message" && it.role === "assistant") {
      flushTools();
      messages.push({ role: "assistant", content: textFromContent(it.content) });
      continue;
    }
    if (it.type === "message" && it.role === "system") {
      flushTools();
      messages.push({ role: "system", content: textFromContent(it.content) });
      continue;
    }
    if (it.type === "function_call") {
      pendingToolCalls ??= [];
      pendingToolCalls.push({
        id: it.call_id || it.id || `call_${pendingToolCalls.length}`,
        type: "function",
        function: { name: it.name, arguments: typeof it.arguments === "string" ? it.arguments : JSON.stringify(it.arguments ?? {}) },
      });
      continue;
    }
    if (it.type === "function_call_output") {
      flushTools();
      messages.push({ role: "tool", tool_call_id: it.call_id, content: typeof it.output === "string" ? it.output : JSON.stringify(it.output ?? "") });
      continue;
    }
    // Skip reasoning / unknown items.
  }
  flushTools();
  return messages;
}

export function responsesToolsToChat(tools: any[]): Json[] {
  return (tools || [])
    .filter((t) => t && (t.type === "function" || t.name))
    .map((t) => ({
      type: "function",
      function: {
        name: t.name || t.function?.name,
        description: t.description || t.function?.description || "",
        parameters: t.parameters || t.function?.parameters || { type: "object", properties: {} },
      },
    }));
}

export function responsesToolChoiceToChat(toolChoice: unknown): unknown {
  if (!toolChoice) return "auto";
  if (typeof toolChoice === "string") return toolChoice;
  const tc = toolChoice as any;
  if (tc?.type === "function" && (tc.name || tc.function?.name)) {
    return { type: "function", function: { name: tc.name || tc.function.name } };
  }
  return "auto";
}

function sse(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Call Nebius chat.completions and yield a Responses-API-compatible SSE body
 * (plus a trailing `data: [DONE]`).
 */
export async function nebiusToolsViaChatCompletions(opts: {
  key: string;
  model: string;
  body: Json;
  signal?: AbortSignal;
}): Promise<Response> {
  const { key, model, body, signal } = opts;
  const input = Array.isArray(body.input) ? (body.input as unknown[]) : [];
  const instructions = typeof body.instructions === "string" ? body.instructions : undefined;
  const messages = responsesInputToChatMessages(input, instructions);
  const tools = responsesToolsToChat(Array.isArray(body.tools) ? (body.tools as any[]) : []);
  const payload: Json = {
    model,
    messages,
    stream: true,
    temperature: typeof body.temperature === "number" ? body.temperature : 0.7,
    max_tokens: typeof body.max_output_tokens === "number" ? body.max_output_tokens : 4000,
  };
  if (tools.length) {
    payload.tools = tools;
    payload.tool_choice = responsesToolChoiceToChat(body.tool_choice);
    payload.parallel_tool_calls = body.parallel_tool_calls !== false;
  }

  const upstream = await fetch(NEBIUS_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
    signal,
  });
  if (!upstream.ok) {
    const j = await upstream.json().catch(() => ({} as any));
    const msg = j?.error?.message || j?.detail || `AI provider returned ${upstream.status}`;
    return Response.json({ error: { message: String(msg) } }, { status: upstream.status });
  }
  if (!upstream.body) {
    return Response.json({ error: { message: "AI provider returned an empty body." } }, { status: 502 });
  }

  const respId = `resp_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const createdAt = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (obj: unknown) => controller.enqueue(encoder.encode(sse(obj)));
      push({
        type: "response.created",
        response: {
          id: respId,
          object: "response",
          created_at: createdAt,
          status: "in_progress",
          model,
          output: [],
          error: null,
        },
      });
      push({ type: "response.in_progress", response: { id: respId, status: "in_progress" } });

      let buffer = "";
      let msgId: string | null = null;
      let text = "";
      const toolItems = new Map<number, { id: string; callId: string; name: string; arguments: string; opened: boolean }>();
      let usage: Json | null = null;
      let failed: string | null = null;

      const openMessage = () => {
        if (msgId) return;
        msgId = `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        push({ type: "response.output_item.added", output_index: 0, item: { id: msgId, type: "message", role: "assistant", status: "in_progress", content: [] } });
      };
      const openTool = (index: number, callId: string, name: string) => {
        let t = toolItems.get(index);
        if (!t) {
          t = { id: `fc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`, callId: callId || `call_${index}`, name: name || "", arguments: "", opened: false };
          toolItems.set(index, t);
        }
        if (callId) t.callId = callId;
        if (name) t.name = name;
        if (!t.opened && t.name) {
          t.opened = true;
          push({
            type: "response.output_item.added",
            output_index: index + 1,
            item: { id: t.id, type: "function_call", call_id: t.callId, name: t.name, arguments: "", status: "in_progress" },
          });
          push({ type: "response.function_call_arguments.delta", item_id: t.id, output_index: index + 1, delta: "" });
        }
        return t;
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            for (const line of frame.split("\n")) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (!payload || payload === "[DONE]") continue;
              let parsed: any;
              try { parsed = JSON.parse(payload); } catch { continue; }
              if (parsed?.usage) usage = parsed.usage;
              const choice = parsed?.choices?.[0];
              const delta = choice?.delta || {};
              if (typeof delta.content === "string" && delta.content) {
                openMessage();
                text += delta.content;
                push({ type: "response.output_text.delta", item_id: msgId, output_index: 0, content_index: 0, delta: delta.content });
              }
              if (Array.isArray(delta.tool_calls)) {
                for (const tc of delta.tool_calls) {
                  const idx = typeof tc.index === "number" ? tc.index : 0;
                  const t = openTool(idx, tc.id, tc.function?.name);
                  const argDelta = tc.function?.arguments;
                  if (typeof argDelta === "string" && argDelta) {
                    t.arguments += argDelta;
                    if (t.opened) push({ type: "response.function_call_arguments.delta", item_id: t.id, output_index: idx + 1, delta: argDelta });
                  }
                }
              }
              if (parsed?.error?.message) failed = String(parsed.error.message);
            }
          }
        }
      } catch (e: any) {
        failed = e?.name === "AbortError" ? "aborted" : String(e?.message || e);
      }

      if (failed && failed !== "aborted") {
        push({ type: "error", code: "api_error", message: failed });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      const output: Json[] = [];
      if (msgId) {
        push({ type: "response.output_text.done", item_id: msgId, output_index: 0, content_index: 0, text });
        const item = {
          id: msgId,
          type: "message",
          role: "assistant",
          status: "completed",
          content: [{ type: "output_text", text, annotations: [] }],
        };
        push({ type: "response.output_item.done", output_index: 0, item });
        output.push(item);
      }
      const sortedTools = [...toolItems.entries()].sort((a, b) => a[0] - b[0]);
      for (const [idx, t] of sortedTools) {
        if (!t.opened) continue;
        push({ type: "response.function_call_arguments.done", item_id: t.id, output_index: idx + 1, arguments: t.arguments });
        const item = { id: t.id, type: "function_call", call_id: t.callId, name: t.name, arguments: t.arguments, status: "completed" };
        push({ type: "response.output_item.done", output_index: idx + 1, item });
        output.push(item);
      }

      const inTok = Number((usage as any)?.prompt_tokens || (usage as any)?.input_tokens || 0);
      const outTok = Number((usage as any)?.completion_tokens || (usage as any)?.output_tokens || 0);
      push({
        type: "response.completed",
        response: {
          id: respId,
          object: "response",
          created_at: createdAt,
          status: "completed",
          model,
          output,
          usage: {
            input_tokens: inTok,
            output_tokens: outTok,
            total_tokens: inTok + outTok,
            input_tokens_details: { cached_tokens: 0 },
            output_tokens_details: { reasoning_tokens: 0 },
          },
          error: null,
        },
      });
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
  });
}
