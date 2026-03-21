/**
 * resolve.ts — Trust Resolution Engine
 *
 * Pipeline: fetch card → check ERC-8004 → check local attestations →
 *           sybil analysis → task-fit evaluation → composite score →
 *           AI reasoning → verdict + signed receipt
 */
import type {
  ResolveRequest, ResolveResult, Verdict, RiskLevel,
  Attestation, AgentState, IdentityReport, SybilIndicators,
} from "./types";
import { callAI } from "./ai";
import type { Env } from "./types";

interface ResolveContext {
  env: Env;
  state: AgentState;
}

export async function resolveAgent(
  req: ResolveRequest,
  ctx: ResolveContext,
): Promise<ResolveResult> {
  const { agentUrl, task } = req;

  // ── Step 1: Fetch agent card ─────────────────────────────────
  const identity: IdentityReport = {
    reachable: false,
    hasAgentCard: false,
    name: null,
    capabilities: [],
    erc8004Registered: false,
  };

  try {
    const cardRes = await fetch(
      `${agentUrl.replace(/\/$/, "")}/.well-known/agent.json`,
      { signal: AbortSignal.timeout(5000) },
    );
    identity.reachable = true;
    if (cardRes.ok) {
      const card = (await cardRes.json()) as {
        name?: string;
        capabilities?: string[];
        tags?: string[];
        identity?: { standard?: string };
      };
      identity.hasAgentCard = true;
      identity.name = card.name ?? null;
      identity.capabilities = card.capabilities ?? card.tags ?? [];
      identity.erc8004Registered = card.identity?.standard === "ERC-8004";
    }
  } catch {
    // Agent unreachable — identity stays at defaults
  }

  // ── Step 2: Query onchain reputation via JSON-RPC ────────────
  let onchainReputation = { feedbackCount: 0, averageScore: 0 };
  try {
    const res = await fetch(ctx.env.CHAIN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "eth_call",
        params: [{
          to: ctx.env.REPUTATION_REGISTRY,
          data: "0x9c89a0e2" + (identity.name ?? "").padStart(64, "0"),
        }, "latest"],
      }),
    });
    const rpc = (await res.json()) as { result?: string };
    if (rpc.result && rpc.result !== "0x" && rpc.result.length > 66) {
      const score = parseInt(rpc.result.slice(2, 66), 16);
      const count = parseInt(rpc.result.slice(66, 130), 16);
      if (count > 0) {
        onchainReputation = { feedbackCount: count, averageScore: score };
      }
    }
  } catch { /* non-fatal */ }

  // ── Step 3: Check local attestation history ──────────────────
  const targetName = (identity.name ?? "").toLowerCase();
  const targetUrl = agentUrl.toLowerCase();
  const directAttestations = ctx.state.attestationsReceived.filter(
    (a) =>
      a.from.toLowerCase() === targetUrl ||
      a.from.toLowerCase() === targetName ||
      a.to.toLowerCase() === targetUrl ||
      a.to.toLowerCase() === targetName,
  );
  const localTrust = {
    directAttestations: directAttestations.length,
    averageScore: directAttestations.length > 0
      ? Math.round(directAttestations.reduce((s, a) => s + a.score, 0) / directAttestations.length)
      : 0,
    categories: [...new Set(directAttestations.map((a) => a.category))],
  };

  // ── Step 4: Sybil indicators ─────────────────────────────────
  const allAttestations = ctx.state.attestationsReceived;
  const selfAttestations = allAttestations.filter((a) => a.from === a.to);
  const oneHourAgo = Date.now() - 3_600_000;
  const recentBurst = allAttestations.filter((a) => a.timestamp > oneHourAgo);
  const uniqueAttestors = new Set(allAttestations.map((a) => a.from)).size;

  const sybilIndicators: SybilIndicators = {
    selfAttestationDetected: selfAttestations.length > 0,
    attestationVelocityNormal: recentBurst.length <= 10,
    uniqueAttestorRatio: allAttestations.length > 0
      ? Math.round((uniqueAttestors / allAttestations.length) * 100) / 100
      : 1.0,
  };

  // ── Step 5: Task-fit evaluation ──────────────────────────────
  const capabilityMatch = task?.requiredCapabilities.filter((cap) =>
    identity.capabilities.some(
      (c) => c.toLowerCase().includes(cap.toLowerCase()) ||
        cap.toLowerCase().includes(c.toLowerCase()),
    ),
  ) ?? [];
  const capabilityGap = task?.requiredCapabilities.filter(
    (cap) => !capabilityMatch.includes(cap),
  ) ?? [];

  // ── Step 6: Composite score ──────────────────────────────────
  const onchainScore = Math.min(100, onchainReputation.averageScore * 20);
  const registrationBonus = identity.erc8004Registered ? 100 : 0;
  const cardQuality =
    (identity.reachable ? 30 : 0) +
    (identity.hasAgentCard ? 40 : 0) +
    (identity.capabilities.length > 0 ? 30 : 0);
  const capabilityFit = task
    ? (task.requiredCapabilities.length > 0
      ? (capabilityMatch.length / task.requiredCapabilities.length) * 100
      : 100)
    : 50;

  let sybilPenalty = 0;
  if (sybilIndicators.selfAttestationDetected) sybilPenalty += 15;
  if (!sybilIndicators.attestationVelocityNormal) sybilPenalty += 10;
  if (sybilIndicators.uniqueAttestorRatio < 0.5) sybilPenalty += 10;

  const rawScore =
    onchainScore * 0.30 +
    localTrust.averageScore * 0.25 +
    registrationBonus * 0.15 +
    cardQuality * 0.15 +
    capabilityFit * 0.15 -
    sybilPenalty;

  const trustScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  // ── Step 7: Risk-adjusted safeguards ─────────────────────────
  const riskLevel = task?.riskLevel ?? "medium";
  const safeguards = computeSafeguards(trustScore, riskLevel, capabilityGap);
  const riskAssessment = computeRiskAssessment(trustScore, riskLevel);

  // ── Step 8: Confidence ───────────────────────────────────────
  let signalCount = 0;
  if (identity.reachable) signalCount++;
  if (identity.hasAgentCard) signalCount++;
  if (identity.erc8004Registered) signalCount++;
  if (onchainReputation.feedbackCount > 0) signalCount++;
  if (localTrust.directAttestations > 0) signalCount++;
  const confidence = Math.round((signalCount / 5) * 100) / 100;

  // ── Step 9: Verdict ──────────────────────────────────────────
  const verdict = computeVerdict(trustScore, confidence, riskLevel);

  // ── Step 10: AI reasoning ────────────────────────────────────
  let reasoning = `Score ${trustScore}/100 from ${signalCount} signal sources. Verdict: ${verdict}.`;
  try {
    reasoning = await callAI(ctx.env, {
      system:
        "You are TrustVault, a trust resolution engine for autonomous agents. " +
        "Given evidence about an agent (on-chain state, attestations, capabilities, " +
        "sybil indicators), provide a 2-3 sentence trust assessment. " +
        "Be specific: name the strongest signal and the biggest risk. " +
        "If there's a capability gap for the requested task, mention it. " +
        "Do not hedge — give a clear recommendation.",
      user: JSON.stringify({
        agentName: identity.name ?? agentUrl,
        trustScore,
        verdict,
        attestations: localTrust.directAttestations,
        categories: localTrust.categories,
        taskDescription: task?.description ?? task?.type ?? "general cooperation",
        erc8004Registered: identity.erc8004Registered,
        onchainFeedback: onchainReputation.feedbackCount,
        capabilityMatch,
        capabilityGap,
        riskLevel,
        sybilIndicators,
      }),
    });
  } catch { /* keep default reasoning */ }

  // ── Step 11: Signed receipt ──────────────────────────────────
  const receiptId = crypto.randomUUID();
  const resolvedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const digestInput = `${receiptId}:${verdict}:${trustScore}:${resolvedAt}`;
  const digestBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(digestInput),
  );
  const digest = Array.from(new Uint8Array(digestBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    verdict,
    confidence,
    trustScore,
    taskFit: { capabilityMatch, capabilityGap, riskAssessment, safeguards },
    report: { identity, onchainReputation, localTrust, sybilIndicators, reasoning },
    receipt: { id: receiptId, resolvedAt, expiresAt, resolver: "TrustVault/2.1.0", targetAgent: agentUrl, digest },
  };
}

function computeVerdict(score: number, confidence: number, risk: RiskLevel): Verdict {
  if (confidence < 0.2) return "UNKNOWN";
  const thresholds: Record<RiskLevel, { trusted: number; cautious: number }> = {
    low: { trusted: 40, cautious: 20 },
    medium: { trusted: 55, cautious: 35 },
    high: { trusted: 70, cautious: 50 },
    critical: { trusted: 85, cautious: 65 },
  };
  const t = thresholds[risk];
  if (score >= t.trusted) return "TRUSTED";
  if (score >= t.cautious) return "CAUTIOUS";
  return "UNTRUSTED";
}

function computeRiskAssessment(score: number, taskRisk: RiskLevel): RiskLevel {
  const levels: RiskLevel[] = ["low", "medium", "high", "critical"];
  let idx = levels.indexOf(taskRisk);
  if (score < 30) idx = Math.min(idx + 2, 3);
  else if (score < 50) idx = Math.min(idx + 1, 3);
  else if (score > 80) idx = Math.max(idx - 1, 0);
  return levels[idx];
}

function computeSafeguards(score: number, risk: RiskLevel, capabilityGap: string[]): string[] {
  const safeguards: string[] = [];

  if (score < 30) {
    safeguards.push("Do not delegate unsupervised work");
    safeguards.push("Require attestation proof before proceeding");
  } else if (score < 55) {
    safeguards.push("Review outputs before accepting");
    safeguards.push("Set explicit timeout and rollback plan");
  }

  if (risk === "critical" || risk === "high") {
    safeguards.push("Require on-chain attestation as escrow");
    if (score < 70) safeguards.push("Request third-party validation");
  }

  if (capabilityGap.length > 0) {
    safeguards.push(`Verify capability for: ${capabilityGap.join(", ")} — not confirmed in agent card`);
  }

  if (safeguards.length === 0) {
    safeguards.push("Standard cooperation — no additional safeguards required");
  }

  return safeguards;
}
