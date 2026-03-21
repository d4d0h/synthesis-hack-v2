/**
 * Trust Resolution Engine
 *
 * Pipeline: fetch card → check onchain → analyze attestations →
 *           task-fit → composite score → AI reasoning → verdict + receipt
 */
import type {
  ResolveRequest, ResolveResult, Verdict, RiskLevel,
  Attestation, AgentState, IdentityReport, SybilIndicators,
} from "./types";
import { callAI } from "./ai";
import { jsonRpc } from "./erc8004";
import { sha256Hex } from "./crypto";
import type { Env } from "./types";

const VERSION = "TrustVault/2.1.0";
const SELECTORS = { getReputation: "0x9c89a0e2" } as const;

interface ResolveContext {
  env: Env;
  state: AgentState;
}

export async function resolveAgent(
  req: ResolveRequest,
  ctx: ResolveContext,
): Promise<ResolveResult> {
  const { agentUrl, task } = req;
  const normalizedUrl = agentUrl.replace(/\/$/, "");

  // Fetch agent card
  const identity = await fetchAgentCard(normalizedUrl);

  // Query onchain reputation (uses address from agent's wallet, not name)
  const agentAddress = ctx.state.address;
  const onchainReputation = await queryReputation(ctx.env, agentAddress);

  // Single-pass attestation analysis
  const { localTrust, sybilIndicators } = analyzeAttestations(
    ctx.state.attestationsReceived, agentUrl, identity.name,
  );

  // Task-fit evaluation
  const required = task?.requiredCapabilities ?? [];
  const capabilityMatch = required.filter((cap) => {
    const capLower = cap.toLowerCase();
    return identity.capabilities.some((c) => {
      const cLower = c.toLowerCase();
      return cLower.includes(capLower) || capLower.includes(cLower);
    });
  });
  const capabilityGap = required.filter((cap) => !capabilityMatch.includes(cap));

  // Composite score
  const trustScore = computeCompositeScore(
    onchainReputation, localTrust, identity, capabilityMatch, required, task, sybilIndicators,
  );

  // Risk + safeguards
  const riskLevel = task?.riskLevel ?? "medium";
  const safeguards = computeSafeguards(trustScore, riskLevel, capabilityGap);
  const riskAssessment = computeRiskAssessment(trustScore, riskLevel);

  // Confidence (how many signal sources we have)
  let signalCount = 0;
  if (identity.reachable) signalCount++;
  if (identity.hasAgentCard) signalCount++;
  if (identity.erc8004Registered) signalCount++;
  if (onchainReputation.feedbackCount > 0) signalCount++;
  if (localTrust.directAttestations > 0) signalCount++;
  const confidence = Math.round((signalCount / 5) * 100) / 100;

  const verdict = computeVerdict(trustScore, confidence, riskLevel);

  // AI reasoning
  let reasoning = `Score ${trustScore}/100 from ${signalCount} signal sources. Verdict: ${verdict}.`;
  try {
    reasoning = await callAI(ctx.env, {
      system:
        "You are TrustVault, a trust resolution engine for autonomous agents. " +
        "Given evidence about an agent, provide a 2-3 sentence trust assessment. " +
        "Be specific: name the strongest signal and the biggest risk. " +
        "If there's a capability gap for the requested task, mention it. " +
        "Do not hedge — give a clear recommendation.",
      user: JSON.stringify({
        agentName: identity.name ?? agentUrl,
        trustScore, verdict,
        attestations: localTrust.directAttestations,
        categories: localTrust.categories,
        taskDescription: task?.description ?? task?.type ?? "general cooperation",
        erc8004Registered: identity.erc8004Registered,
        onchainFeedback: onchainReputation.feedbackCount,
        capabilityMatch, capabilityGap, riskLevel, sybilIndicators,
      }),
    });
  } catch { /* keep default reasoning */ }

  // Signed receipt
  const receiptId = crypto.randomUUID();
  const resolvedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const digest = await sha256Hex(`${receiptId}:${verdict}:${trustScore}:${resolvedAt}`);

  return {
    verdict, confidence, trustScore,
    taskFit: { capabilityMatch, capabilityGap, riskAssessment, safeguards },
    report: { identity, onchainReputation, localTrust, sybilIndicators, reasoning },
    receipt: { id: receiptId, resolvedAt, expiresAt, resolver: VERSION, targetAgent: agentUrl, digest },
  };
}

// ── Helpers ────────────────────────────────────────────────────

async function fetchAgentCard(baseUrl: string): Promise<IdentityReport> {
  const identity: IdentityReport = {
    reachable: false, hasAgentCard: false, name: null, capabilities: [], erc8004Registered: false,
  };
  try {
    const res = await fetch(`${baseUrl}/.well-known/agent.json`, {
      signal: AbortSignal.timeout(5000),
    });
    identity.reachable = true;
    if (res.ok) {
      const card = (await res.json()) as Record<string, unknown>;
      identity.hasAgentCard = true;
      identity.name = typeof card.name === "string" ? card.name : null;
      identity.capabilities = Array.isArray(card.capabilities) ? card.capabilities as string[] :
        Array.isArray(card.tags) ? card.tags as string[] : [];
      const ident = card.identity as Record<string, unknown> | undefined;
      identity.erc8004Registered = ident?.standard === "ERC-8004";
    }
  } catch { /* unreachable */ }
  return identity;
}

async function queryReputation(
  env: Env, agentAddress: string,
): Promise<{ feedbackCount: number; averageScore: number }> {
  try {
    const result = await jsonRpc(env.CHAIN_RPC_URL, "eth_call", [{
      to: env.REPUTATION_REGISTRY,
      data: SELECTORS.getReputation + agentAddress.slice(2).padStart(64, "0"),
    }, "latest"]);
    if (result !== "0x" && result.length > 66) {
      const score = parseInt(result.slice(2, 66), 16);
      const count = parseInt(result.slice(66, 130), 16);
      if (count > 0 && !isNaN(score) && !isNaN(count)) {
        return { feedbackCount: count, averageScore: score };
      }
    }
  } catch { /* non-fatal */ }
  return { feedbackCount: 0, averageScore: 0 };
}

/** Single-pass analysis over attestation history */
function analyzeAttestations(
  attestations: readonly Attestation[],
  targetUrl: string,
  targetName: string | null,
) {
  const urlLower = targetUrl.toLowerCase();
  const nameLower = (targetName ?? "").toLowerCase();

  let directCount = 0, directScoreSum = 0;
  const directCategories = new Set<string>();
  let selfAttestCount = 0, recentCount = 0;
  const uniqueAttestors = new Set<string>();
  const oneHourAgo = Date.now() - 3_600_000;

  for (const a of attestations) {
    const fromLower = a.from.toLowerCase();
    const toLower = a.to.toLowerCase();

    // Direct attestation check
    if (fromLower === urlLower || fromLower === nameLower ||
        toLower === urlLower || toLower === nameLower) {
      directCount++;
      directScoreSum += a.score;
      directCategories.add(a.category);
    }

    // Sybil signals
    if (a.from === a.to) selfAttestCount++;
    if (a.timestamp > oneHourAgo) recentCount++;
    uniqueAttestors.add(a.from);
  }

  return {
    localTrust: {
      directAttestations: directCount,
      averageScore: directCount > 0 ? Math.round(directScoreSum / directCount) : 0,
      categories: [...directCategories],
    },
    sybilIndicators: {
      selfAttestationDetected: selfAttestCount > 0,
      attestationVelocityNormal: recentCount <= 10,
      uniqueAttestorRatio: attestations.length > 0
        ? Math.round((uniqueAttestors.size / attestations.length) * 100) / 100
        : 1.0,
    } satisfies SybilIndicators,
  };
}

function computeCompositeScore(
  onchain: { averageScore: number },
  local: { averageScore: number },
  identity: IdentityReport,
  capMatch: string[],
  capRequired: string[],
  task: ResolveRequest["task"],
  sybil: SybilIndicators,
): number {
  const onchainScore = Math.min(100, onchain.averageScore * 20);
  const registrationBonus = identity.erc8004Registered ? 100 : 0;
  const cardQuality =
    (identity.reachable ? 30 : 0) +
    (identity.hasAgentCard ? 40 : 0) +
    (identity.capabilities.length > 0 ? 30 : 0);
  const capabilityFit = task
    ? (capRequired.length > 0 ? (capMatch.length / capRequired.length) * 100 : 100)
    : 50;

  let sybilPenalty = 0;
  if (sybil.selfAttestationDetected) sybilPenalty += 15;
  if (!sybil.attestationVelocityNormal) sybilPenalty += 10;
  if (sybil.uniqueAttestorRatio < 0.5) sybilPenalty += 10;

  const raw =
    onchainScore * 0.30 +
    local.averageScore * 0.25 +
    registrationBonus * 0.15 +
    cardQuality * 0.15 +
    capabilityFit * 0.15 -
    sybilPenalty;

  return Math.max(0, Math.min(100, Math.round(raw)));
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
