/**
 * TrustVault v2.2 — Trust Resolution + Outcome Assurance
 *
 * Give it any agent URL + task context → get a verdict, capability analysis,
 * risk-adjusted safeguards, AI reasoning, and a signed receipt.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { TrustAgent } from "./agent";
import { agentCard } from "./agent-card";
import { erc8004Routes } from "./erc8004";
import { renderUI } from "./ui";
import type { Env } from "./types";

export { TrustAgent };

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ─── Landing Page ───
app.get("/", (c) => {
  const base = new URL(c.req.url).origin;
  return c.html(renderUI(base));
});

// ─── Agent Card (ERC-8004 / A2A discovery) ───
app.get("/.well-known/agent.json", (c) => c.json(agentCard(c.env)));

// ─── Cover Image ───
app.get("/cover.svg", async (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0f172a"/><stop offset="100%" style="stop-color:#1e293b"/></linearGradient><linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#3b82f6"/><stop offset="100%" style="stop-color:#8b5cf6"/></linearGradient><linearGradient id="green" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#10b981"/><stop offset="100%" style="stop-color:#34d399"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><g opacity="0.05"><line x1="0" y1="0" x2="0" y2="630" stroke="white" stroke-width="1" transform="translate(60,0)"/><line x1="0" y1="0" x2="0" y2="630" stroke="white" stroke-width="1" transform="translate(120,0)"/><line x1="0" y1="0" x2="0" y2="630" stroke="white" stroke-width="1" transform="translate(180,0)"/><line x1="0" y1="0" x2="0" y2="630" stroke="white" stroke-width="1" transform="translate(240,0)"/><line x1="0" y1="0" x2="1200" y2="0" stroke="white" stroke-width="1" transform="translate(0,60)"/><line x1="0" y1="0" x2="1200" y2="0" stroke="white" stroke-width="1" transform="translate(0,120)"/><line x1="0" y1="0" x2="1200" y2="0" stroke="white" stroke-width="1" transform="translate(0,180)"/></g><g transform="translate(100,140)"><path d="M50 0 L100 25 L100 65 C100 95 75 120 50 130 C25 120 0 95 0 65 L0 25 Z" fill="none" stroke="url(#accent)" stroke-width="3" opacity="0.9"/><path d="M35 65 L48 78 L70 50" fill="none" stroke="url(#green)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g><text x="240" y="185" font-family="system-ui,-apple-system,sans-serif" font-size="64" font-weight="700" fill="white">TrustVault</text><text x="240" y="230" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#94a3b8">Open Trust Resolution Protocol for Agents</text><rect x="100" y="280" width="1000" height="2" fill="url(#accent)" opacity="0.3" rx="1"/><g transform="translate(100,320)"><rect width="460" height="180" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/><text x="24" y="36" font-family="monospace" font-size="18" font-weight="700" fill="#3b82f6">POST /resolve</text><text x="24" y="64" font-family="system-ui,sans-serif" font-size="15" fill="#e2e8f0">Pre-task: Should I cooperate?</text><text x="24" y="96" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">TRUSTED / CAUTIOUS / UNTRUSTED / UNKNOWN</text><text x="24" y="120" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">Capability gap + Safeguards + Sybil check</text><text x="24" y="150" font-family="system-ui,sans-serif" font-size="13" fill="#10b981">+ Signed receipt as proof</text></g><g transform="translate(640,320)"><rect width="460" height="180" rx="12" fill="#1e293b" stroke="#334155" stroke-width="1"/><text x="24" y="36" font-family="monospace" font-size="18" font-weight="700" fill="#8b5cf6">POST /assure</text><text x="24" y="64" font-family="system-ui,sans-serif" font-size="15" fill="#e2e8f0">Post-task: Can I trust the result?</text><text x="24" y="96" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">ASSURED / FLAGGED / INSUFFICIENT_DATA</text><text x="24" y="120" font-family="system-ui,sans-serif" font-size="13" fill="#94a3b8">6-check pipeline + AI verification</text><text x="24" y="150" font-family="system-ui,sans-serif" font-size="13" fill="#10b981">+ Signed certificate as proof</text></g><rect x="100" y="530" width="1000" height="32" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1"/><text x="120" y="551" font-family="monospace" font-size="13" fill="#64748b">ERC-8004 Onchain Identity</text><text x="380" y="551" font-family="monospace" font-size="13" fill="#64748b">Groq AI (Llama 3.3 70B)</text><text x="620" y="551" font-family="monospace" font-size="13" fill="#64748b">Cloudflare Workers</text><text x="840" y="551" font-family="monospace" font-size="13" fill="#64748b">Synthesis Hackathon 2026</text><rect x="1020" y="155" width="80" height="28" rx="14" fill="url(#accent)" opacity="0.2"/><text x="1060" y="174" font-family="monospace" font-size="14" fill="#93c5fd" text-anchor="middle">v2.2.0</text></svg>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
});

// ─── Health ───
app.get("/health", (c) =>
  c.json({
    status: "ok",
    agent: "TrustVault",
    version: "2.2.0",
    features: [
      "trust-resolution-protocol",
      "outcome-assurance",
      "task-aware-verdicts",
      "signed-receipts",
      "signed-certificates",
      "sybil-detection",
      "erc8004-identity",
      "attestation-management",
    ],
    timestamp: Date.now(),
  })
);

// ─── Trust Resolution (the key feature) ───
app.post("/resolve", async (c) => {
  const body = await c.req.json();
  const agent = getAgent(c.env);
  return c.json(await agent.resolve(body));
});

app.get("/resolution-log", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getResolutionLog());
});

// ─── Outcome Assurance ───
app.post("/assure", async (c) => {
  const body = await c.req.json();
  const agent = getAgent(c.env);
  return c.json(await agent.assure(body));
});

app.get("/assurance-log", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getAssuranceLog());
});

// ─── Trust Resume (public, read-only) ───
app.get("/trust/resume", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getResume());
});

app.get("/trust/resume/:address", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getRemoteResume(c.req.param("address")));
});

// ─── Attestations ───
app.post("/trust/attest", async (c) => {
  const body = await c.req.json();
  const agent = getAgent(c.env);
  return c.json(await agent.handleAttestation(body));
});

app.get("/trust/attestations", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getAttestations());
});

app.get("/trust/attestations/:address", async (c) => {
  const agent = getAgent(c.env);
  return c.json(await agent.getAttestationsFor(c.req.param("address")));
});

// ─── Cooperation ───
app.post("/trust/cooperate", async (c) => {
  const body = await c.req.json();
  const agent = getAgent(c.env);
  return c.json(await agent.evaluateCooperation(body));
});

app.post("/trust/cooperate/accept", async (c) => {
  const body = await c.req.json();
  const agent = getAgent(c.env);
  return c.json(await agent.handleCooperationRequest(body));
});

// ─── ERC-8004 onchain routes ───
app.route("/erc8004", erc8004Routes());

// ─── AI Chat ───
app.post("/chat", async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  const agent = getAgent(c.env);
  return c.json(await agent.chat(message));
});

// ─── Durable Object accessor ───
function getAgent(env: Env): DurableObjectStub<TrustAgent> {
  const id = env.TRUST_AGENT.idFromName("trustvault-singleton");
  return env.TRUST_AGENT.get(id) as DurableObjectStub<TrustAgent>;
}

export default app;
