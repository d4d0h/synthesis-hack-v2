/**
 * AI module — multi-provider with fallback chain
 * Primary: Anthropic Claude (reasoning)
 * Budget: Venice AI (no data retention) or OpenRouter/MiniMax
 */
import type { Env } from "./types";

interface AIRequest {
  system: string;
  user: string;
  budget?: boolean; // use budget model for high-volume calls
}

export async function callAI(env: Env, req: AIRequest): Promise<string> {
  // Try Venice first for budget calls (no data retention)
  if (req.budget && env.VENICE_API_KEY) {
    try {
      return await callVenice(env.VENICE_API_KEY, req);
    } catch {
      // Fall through to Anthropic
    }
  }

  // Primary: Anthropic Claude
  if (env.ANTHROPIC_API_KEY) {
    try {
      return await callAnthropic(env.ANTHROPIC_API_KEY, req);
    } catch {
      // Fall through to OpenRouter
    }
  }

  // Fallback: OpenRouter
  if (env.OPENROUTER_API_KEY) {
    return await callOpenRouter(env.OPENROUTER_API_KEY, req);
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

async function callVenice(apiKey: string, req: AIRequest): Promise<string> {
  const res = await fetch("https://api.venice.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b",
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`Venice ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || "";
}

async function callOpenRouter(apiKey: string, req: AIRequest): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "minimax/minimax-m2.7",
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      max_tokens: 1024,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content || "";
}
