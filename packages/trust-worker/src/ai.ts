/**
 * AI module — multi-provider with fallback chain
 * Primary: Anthropic Claude | Budget: Venice AI | Fallback: OpenRouter/MiniMax
 */
import type { Env } from "./types";

interface AIRequest {
  system: string;
  user: string;
  budget?: boolean;
}

export async function callAI(env: Env, req: AIRequest): Promise<string> {
  // Primary: Groq (free tier, fast inference)
  if (env.GROQ_API_KEY) {
    try {
      return await callOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        env.GROQ_API_KEY, "llama-3.3-70b-versatile", req
      );
    } catch { /* fall through */ }
  }

  // Fallback 1: Venice AI (budget mode)
  if (env.VENICE_API_KEY) {
    try {
      return await callOpenAICompatible(
        "https://api.venice.ai/api/v1/chat/completions",
        env.VENICE_API_KEY, "llama-3.3-70b", req
      );
    } catch { /* fall through */ }
  }

  // Fallback 2: Anthropic Claude
  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.startsWith("sk-ant-")) {
    try {
      return await callAnthropic(env.ANTHROPIC_API_KEY, req);
    } catch { /* fall through */ }
  }

  // Fallback 3: OpenRouter (free models)
  if (env.OPENROUTER_API_KEY) {
    return await callOpenAICompatible(
      "https://openrouter.ai/api/v1/chat/completions",
      env.OPENROUTER_API_KEY, "meta-llama/llama-3.3-70b-instruct:free", req
    );
  }

  throw new Error("No AI provider configured");
}

async function callAnthropic(apiKey: string, req: AIRequest): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { content: Array<{ text: string }> };
  return data.content[0]?.text || "";
}

async function callOpenAICompatible(
  url: string,
  apiKey: string,
  model: string,
  req: AIRequest
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`${model} ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || "";
}
