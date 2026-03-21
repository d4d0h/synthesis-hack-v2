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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0a0a0a"/>
<g opacity="0.06"><line x1="60" y1="0" x2="60" y2="630" stroke="#fff" stroke-width="1"/><line x1="120" y1="0" x2="120" y2="630" stroke="#fff" stroke-width="1"/><line x1="180" y1="0" x2="180" y2="630" stroke="#fff" stroke-width="1"/><line x1="240" y1="0" x2="240" y2="630" stroke="#fff" stroke-width="1"/><line x1="300" y1="0" x2="300" y2="630" stroke="#fff" stroke-width="1"/><line x1="0" y1="60" x2="1200" y2="60" stroke="#fff" stroke-width="1"/><line x1="0" y1="120" x2="1200" y2="120" stroke="#fff" stroke-width="1"/><line x1="0" y1="180" x2="1200" y2="180" stroke="#fff" stroke-width="1"/></g>
<g transform="translate(100,130) scale(3.5)" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></g>
<text x="220" y="185" font-family="monospace" font-size="64" font-weight="700" fill="#fff">TrustVault</text>
<text x="220" y="225" font-family="monospace" font-size="18" fill="#555">trust resolution + outcome assurance for agents</text>
<text x="222" y="225" font-family="monospace" font-size="18" fill="#555">_</text>
<rect x="100" y="270" width="1000" height="1" fill="#2a2a2a"/>
<g transform="translate(100,300)"><rect width="460" height="170" rx="4" fill="#141414" stroke="#2a2a2a" stroke-width="1"/><text x="20" y="24" font-family="monospace" font-size="11" fill="#e53e3e" text-transform="uppercase">PRE-TASK</text><text x="20" y="50" font-family="monospace" font-size="18" font-weight="700" fill="#38a169">POST</text><text x="75" y="50" font-family="monospace" font-size="18" font-weight="700" fill="#dd6b20">/resolve</text><text x="20" y="78" font-family="monospace" font-size="13" fill="#e0e0e0">should I cooperate with this agent?</text><text x="20" y="105" font-family="monospace" font-size="11" fill="#555">TRUSTED / CAUTIOUS / UNTRUSTED / UNKNOWN</text><text x="20" y="125" font-family="monospace" font-size="11" fill="#555">capability gap + safeguards + sybil check</text><text x="20" y="150" font-family="monospace" font-size="11" fill="#38a169">+ signed receipt as proof</text></g>
<g transform="translate(640,300)"><rect width="460" height="170" rx="4" fill="#141414" stroke="#2a2a2a" stroke-width="1"/><text x="20" y="24" font-family="monospace" font-size="11" fill="#e53e3e" text-transform="uppercase">POST-TASK</text><text x="20" y="50" font-family="monospace" font-size="18" font-weight="700" fill="#38a169">POST</text><text x="75" y="50" font-family="monospace" font-size="18" font-weight="700" fill="#dd6b20">/assure</text><text x="20" y="78" font-family="monospace" font-size="13" fill="#e0e0e0">can I trust what they delivered?</text><text x="20" y="105" font-family="monospace" font-size="11" fill="#555">ASSURED / FLAGGED / INSUFFICIENT_DATA</text><text x="20" y="125" font-family="monospace" font-size="11" fill="#555">6-check pipeline + AI verification</text><text x="20" y="150" font-family="monospace" font-size="11" fill="#38a169">+ signed certificate as proof</text></g>
<rect x="100" y="500" width="1000" height="1" fill="#2a2a2a"/>
<text x="120" y="535" font-family="monospace" font-size="12" fill="#555">ERC-8004</text>
<text x="280" y="535" font-family="monospace" font-size="12" fill="#555">groq / llama-3.3-70b</text>
<text x="520" y="535" font-family="monospace" font-size="12" fill="#555">cloudflare workers</text>
<text x="740" y="535" font-family="monospace" font-size="12" fill="#555">sybil detection</text>
<text x="940" y="535" font-family="monospace" font-size="12" fill="#555">signed receipts</text>
<g transform="translate(100,570)"><g transform="scale(0.75)" fill="none" stroke="#e53e3e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></g></g>
<text x="125" y="588" font-family="monospace" font-size="12" fill="#555">unbrained labs</text>
<text x="310" y="588" font-family="monospace" font-size="12" fill="#555">synthesis hackathon 2026</text>
<rect x="1020" y="160" width="80" height="24" rx="3" fill="none" stroke="#2a2a2a" stroke-width="1"/><text x="1060" y="177" font-family="monospace" font-size="12" fill="#555" text-anchor="middle">v2.2.0</text>
</svg>`;
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
