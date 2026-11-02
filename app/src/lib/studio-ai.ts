// Server-side config for the AG Studio AI assistant. The LLM key never reaches the browser.
const NEBIUS = "https://api.studio.nebius.com/v1";
// Qwen3-235B-A22B-Instruct-2507 leaves Nebius serverless on 2026-11-09; this is its official replacement.
const NEBIUS_DEFAULT_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";

export function studioAiModels(): string[] {
  const env = process.env.STUDIO_AI_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (env?.length) return env;
  const single = process.env.STUDIO_AI_MODEL?.trim();
  if (single) return [single];
  if (process.env.NEBIUS_API_KEY) return [NEBIUS_DEFAULT_MODEL];
  if (process.env.OPENAI_API_KEY) return ["gpt-5.4-mini"];
  return [];
}

/** Which Responses-API endpoint and key to use: Nebius AI Studio first, then OpenAI. */
export function studioAiUpstream(): { url: string; key: string; reasoning: boolean } | null {
  if (process.env.NEBIUS_API_KEY) return { url: `${NEBIUS}/responses`, key: process.env.NEBIUS_API_KEY, reasoning: false };
  if (process.env.OPENAI_API_KEY) return { url: "https://api.openai.com/v1/responses", key: process.env.OPENAI_API_KEY, reasoning: true };
  return null;
}
