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
  PEER_ADDRESS: string;
  TRUSTVAULT_URL: string;
  TRUSTVAULT: Fetcher;
}

const FALLBACK_ADDRESS = "0x00000000000000000000000000000000deadbeef";

/** Use service binding if available (worker-to-worker), else fall back to public URL */
function tvFetch(env: Env, path: string, init?: RequestInit): Promise<Response> {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (env.TRUSTVAULT) {
    return env.TRUSTVAULT.fetch(new Request(`https://fake-host${cleanPath}`, init));
  }
  const tvUrl = env.TRUSTVAULT_URL || "http://localhost:8787";
  return fetch(`${tvUrl}${cleanPath}`, init);
}

const app = new Hono<{ Bindings: Env }>();
app.use("*", cors());

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

app.get("/health", (c) =>
  c.json({ status: "ok", agent: c.env.PEER_NAME || "VerifyBot", version: "2.0.0" })
);

app.get("/trust/resume", (c) =>
  c.json({
    address: c.env.PEER_ADDRESS || FALLBACK_ADDRESS,
    name: c.env.PEER_NAME || "VerifyBot",
    trustScore: 72,
    totalAttestationCount: 5,
    categories: {
      "code-review": { avgScore: 80, count: 3 },
      reliability: { avgScore: 65, count: 2 },
    },
    recentAttestations: [],
    cooperationHistory: [],
    lastUpdated: Date.now(),
  })
);

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
  const peerAddress = c.env.PEER_ADDRESS || FALLBACK_ADDRESS;
  const steps: Array<{ step: string; result: unknown; ok: boolean }> = [];

  // Step 1: Discover TrustVault and get its address
  let tvAddress = "";
  try {
    const [cardRes, resumeRes] = await Promise.all([
      tvFetch(c.env, "/.well-known/agent.json"),
      tvFetch(c.env, "/trust/resume"),
    ]);
    const card = await cardRes.json();
    const resume = (await resumeRes.json()) as { address?: string };
    tvAddress = resume.address || "";
    steps.push({ step: "1. Discover TrustVault (agent card + resume)", result: { card, resume }, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "1. Discover TrustVault", result: String(e), ok: false });
  }

  // Step 2: Issue attestation to TrustVault (using its real address)
  if (tvAddress) {
    try {
      const res = await tvFetch(c.env, "/trust/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAddress: tvAddress,
          category: "cooperation",
          score: 85,
          evidence: "Peer agent verified TrustVault's cooperation protocol works correctly.",
        }),
      });
      const attestation = await res.json();
      steps.push({ step: "2. Issue attestation to TrustVault", result: attestation, ok: true });
    } catch (e: unknown) {
      steps.push({ step: "2. Issue attestation to TrustVault", result: String(e), ok: false });
    }
  }

  // Step 3: Request cooperation from TrustVault
  try {
    const res = await tvFetch(c.env, "/trust/cooperate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        peerAddress,
        peerUrl: "https://trustvault-peer.leaidedev.workers.dev",
        task: "Joint code review and attestation exchange",
      }),
    });
    const cooperation = await res.json();
    steps.push({ step: "3. Cooperation evaluation", result: cooperation, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "3. Cooperation evaluation", result: String(e), ok: false });
  }

  // Step 4: Check updated trust resume
  try {
    const res = await tvFetch(c.env, "/trust/resume");
    const resume = await res.json();
    steps.push({ step: "4. Post-cooperation trust resume", result: resume, ok: true });
  } catch (e: unknown) {
    steps.push({ step: "4. Post-cooperation trust resume", result: String(e), ok: false });
  }

  return c.json({
    demo: "TrustVault v2 — Full Cooperation Flow",
    stepsCompleted: steps.filter((s) => s.ok).length,
    totalSteps: steps.length,
    steps,
  });
});

export default app;
