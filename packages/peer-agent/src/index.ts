/**
 * Peer Agent — Cooperation Demo Partner
 *
 * A second Cloudflare Worker that demonstrates the full trust
 * cooperation flow with TrustVault:
 *   1. Discover TrustVault via agent card
 *   2. Exchange attestations
 *   3. Evaluate cooperation based on trust scores
 *   4. Accept/decline cooperation requests
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
  PEER_NAME: string;
  TRUSTVAULT_URL: string;
}

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

// ─── Agent Card ───
app.get("/.well-known/agent.json", (c) =>
  c.json({
    name: c.env.PEER_NAME || "VerifyBot",
    description: "A peer agent that verifies work quality and exchanges trust attestations.",
    version: "2.0.0",
    capabilities: ["attestation-issuing", "cooperation-evaluation"],
    endpoints: {
      health: "/health",
      agentCard: "/.well-known/agent.json",
      trustResume: "/trust/resume",
      cooperateAccept: "/trust/cooperate/accept",
      demoFull: "/demo/full-flow",
    },
  })
);

// ─── Health ───
app.get("/health", (c) =>
  c.json({ status: "ok", agent: c.env.PEER_NAME || "VerifyBot", version: "2.0.0" })
);

// ─── Minimal trust resume ───
app.get("/trust/resume", (c) =>
  c.json({
    address: "0xPEER_DEMO_ADDRESS",
    name: c.env.PEER_NAME || "VerifyBot",
    trustScore: 72,
    attestationCount: 5,
    categories: {
      "code-review": { avgScore: 80, count: 3 },
      reliability: { avgScore: 65, count: 2 },
    },
    recentAttestations: [],
    cooperationHistory: [],
    lastUpdated: Date.now(),
  })
);

// ─── Handle cooperation request from TrustVault ───
app.post("/trust/cooperate/accept", async (c) => {
  const body = await c.req.json<{
    fromAddress: string;
    task: string;
    trustScore: number;
  }>();

  const accepted = body.trustScore >= 50;
  return c.json({
    accepted,
    reason: accepted
      ? `Trust score ${body.trustScore} meets our threshold. Let's cooperate!`
      : `Trust score ${body.trustScore} is below our threshold of 50.`,
  });
});

// ─── Full Demo Flow ───
app.get("/demo/full-flow", async (c) => {
  const tvUrl = c.env.TRUSTVAULT_URL || "http://localhost:8787";
  const steps: Array<{ step: string; result: unknown; ok: boolean }> = [];

  // Step 1: Discover TrustVault
  try {
    const res = await fetch(`${tvUrl}/.well-known/agent.json`);
    const card = await res.json();
    steps.push({ step: "1. Discover TrustVault agent card", result: card, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "1. Discover TrustVault agent card", result: String(e), ok: false });
  }

  // Step 2: Check TrustVault's trust resume
  try {
    const res = await fetch(`${tvUrl}/trust/resume`);
    const resume = await res.json();
    steps.push({ step: "2. Query TrustVault trust resume", result: resume, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "2. Query TrustVault trust resume", result: String(e), ok: false });
  }

  // Step 3: Issue attestation to TrustVault
  try {
    const res = await fetch(`${tvUrl}/trust/attest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetAddress: "0xTRUST_VAULT_ADDRESS",
        category: "cooperation",
        score: 85,
        evidence: "Peer agent verified TrustVault's cooperation protocol works correctly.",
      }),
    });
    const attestation = await res.json();
    steps.push({ step: "3. Issue attestation to TrustVault", result: attestation, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "3. Issue attestation to TrustVault", result: String(e), ok: false });
  }

  // Step 4: Request cooperation from TrustVault
  try {
    const res = await fetch(`${tvUrl}/trust/cooperate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peerAddress: "0xPEER_DEMO_ADDRESS",
        peerUrl: `http://localhost:8788`,
        task: "Joint code review and attestation exchange",
      }),
    });
    const cooperation = await res.json();
    steps.push({
      step: "4. Request cooperation evaluation from TrustVault",
      result: cooperation,
      ok: true,
    });
  } catch (e: unknown) {
    steps.push({
      step: "4. Request cooperation evaluation from TrustVault",
      result: String(e),
      ok: false,
    });
  }

  // Step 5: Check updated trust resume
  try {
    const res = await fetch(`${tvUrl}/trust/resume`);
    const resume = await res.json();
    steps.push({
      step: "5. Check TrustVault trust resume (post-cooperation)",
      result: resume,
      ok: true,
    });
  } catch (e: unknown) {
    steps.push({
      step: "5. Check TrustVault trust resume (post-cooperation)",
      result: String(e),
      ok: false,
    });
  }

  return c.json({
    demo: "TrustVault v2 — Full Cooperation Flow",
    stepsCompleted: steps.filter((s) => s.ok).length,
    totalSteps: steps.length,
    steps,
  });
});

export default app;
