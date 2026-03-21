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
import type { Env } from "./types";

export { TrustAgent };

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// ─── Agent Card (ERC-8004 / A2A discovery) ───
app.get("/.well-known/agent.json", (c) => c.json(agentCard(c.env)));

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
