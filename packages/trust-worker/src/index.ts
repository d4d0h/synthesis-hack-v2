/**
 * TrustVault v2 — Main Worker Entry
 *
 * Cloudflare Worker + Durable Object agent that maintains a verifiable
 * trust resume using ERC-8004 onchain identity and attestations.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { TrustAgent } from "./agent";
import { agentCard } from "./agent-card";
import { erc8004Routes } from "./erc8004";
import type { Env } from "./types";

export { TrustAgent };

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ─── Agent Card (ERC-8004 / A2A discovery) ───
app.get("/.well-known/agent.json", (c) => c.json(agentCard(c.env)));

// ─── Health ───
app.get("/health", (c) =>
  c.json({ status: "ok", agent: "TrustVault", version: "2.0.0", timestamp: Date.now() })
);

// ─── Trust Resume (public, read-only) ───
app.get("/trust/resume", async (c) => {
  const agent = await getAgent(c.env);
  return c.json(await agent.getResume());
});

app.get("/trust/resume/:address", async (c) => {
  const agent = await getAgent(c.env);
  const address = c.req.param("address");
  return c.json(await agent.getRemoteResume(address));
});

// ─── Attestations ───
app.post("/trust/attest", async (c) => {
  const body = await c.req.json<{
    targetAddress: string;
    fromAddress?: string;
    category: string;
    score: number;
    evidence?: string;
  }>();
  const agent = getAgent(c.env);
  return c.json(await agent.handleAttestation(body));
});

app.get("/trust/attestations", async (c) => {
  const agent = await getAgent(c.env);
  return c.json(await agent.getAttestations());
});

app.get("/trust/attestations/:address", async (c) => {
  const agent = await getAgent(c.env);
  const address = c.req.param("address");
  return c.json(await agent.getAttestationsFor(address));
});

// ─── Cooperation ───
app.post("/trust/cooperate", async (c) => {
  const body = await c.req.json<{
    peerAddress: string;
    peerUrl: string;
    task: string;
  }>();
  const agent = await getAgent(c.env);
  return c.json(await agent.evaluateCooperation(body));
});

app.post("/trust/cooperate/accept", async (c) => {
  const body = await c.req.json<{
    fromAddress: string;
    task: string;
    trustScore: number;
  }>();
  const agent = await getAgent(c.env);
  return c.json(await agent.handleCooperationRequest(body));
});

// ─── ERC-8004 onchain routes ───
app.route("/erc8004", erc8004Routes());

// ─── AI Chat (for demos / Synthesis judges) ───
app.post("/chat", async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  const agent = await getAgent(c.env);
  return c.json(await agent.chat(message));
});

// ─── Durable Object accessor ───
function getAgent(env: Env): DurableObjectStub<TrustAgent> {
  const id = env.TRUST_AGENT.idFromName("trustvault-singleton");
  return env.TRUST_AGENT.get(id) as DurableObjectStub<TrustAgent>;
}

export default app;
