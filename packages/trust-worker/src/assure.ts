/**
 * Outcome Assurance Engine
 *
 * Post-task verification: "Can I trust what this agent delivered?"
 * Runs 6 checks against performer trust, attestation history,
 * capabilities, output quality, and sybil risk.
 */
import type {
  AssureRequest, AssureResult, AssuranceCheck, AssuranceStatus,
  AgentState, ResolveResult, Env,
} from "./types";
import { callAI } from "./ai";
import { sha256Hex } from "./crypto";
import { resolveAgent } from "./resolve";

const VERSION = "TrustVault/2.2.0";

interface AssureContext {
  env: Env;
  state: AgentState;
  getCachedResolve: (agentUrl: string) => ResolveResult | null;
}

export async function assureOutcome(
  req: AssureRequest,
  ctx: AssureContext,
): Promise<AssureResult> {
  const { taskType, performedBy, artifact, expectedOutcome, validationLevel } = req;

  // Compute artifact hash
  const outputStr = typeof artifact.output === "string"
    ? artifact.output
    : JSON.stringify(artifact.output);
  const artifactHash = artifact.outputHash ?? await sha256Hex(outputStr);

  // Phase 1: Independent checks (parallel)
  const [trustCheck, capabilityCheck, sybilCheck] = await Promise.all([
    checkPerformerTrust(performedBy, ctx),
    checkCapabilityMatch(performedBy, taskType),
    checkSybilRisk(performedBy, ctx),
  ]);

  // Phase 2: Dependent checks (parallel, may use AI)
  const [attestationCheck, completenessCheck, consistencyCheck] = await Promise.all([
    checkAttestationHistory(performedBy, taskType, ctx),
    checkOutputCompleteness(artifact, expectedOutcome, validationLevel ?? "standard", ctx.env),
    checkOutputConsistency(artifact, expectedOutcome, ctx.env),
  ]);

  const checks: AssuranceCheck[] = [
    trustCheck, attestationCheck, capabilityCheck,
    completenessCheck, consistencyCheck, sybilCheck,
  ];

  // Compute confidence
  const passed = checks.filter((c) => c.passed).length;
  const performerScore = trustCheck.score ?? 0;
  const confidence = Math.round(
    ((passed / checks.length) * 0.7 + (performerScore / 100) * 0.3) * 100,
  ) / 100;

  // Determine status
  const status = computeStatus(checks, confidence);

  // AI recommendation
  let recommendation = `${passed}/${checks.length} checks passed. Status: ${status}.`;
  try {
    recommendation = await callAI(ctx.env, {
      system:
        "You are TrustVault, an outcome assurance engine. " +
        "Given check results for a task output, provide a 2-3 sentence recommendation. " +
        "Be specific about what passed and what failed. Give a clear action item.",
      user: JSON.stringify({
        taskType, performedBy, status, confidence,
        artifactSummary: artifact.summary,
        expectedOutcome: expectedOutcome.description,
        checks: checks.map((c) => ({ check: c.check, passed: c.passed, reason: c.reason })),
      }),
    });
  } catch { /* keep default */ }

  // Signed certificate
  const certId = crypto.randomUUID();
  const assuredAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const digest = await sha256Hex(`${certId}:${status}:${artifactHash}:${assuredAt}`);

  return {
    status,
    checks,
    confidence,
    recommendation,
    certificate: {
      id: certId, assuredAt, expiresAt, assurer: VERSION,
      performedBy, taskType, status, artifactHash, digest,
    },
  };
}

// ── Check implementations ──────────────────────────────────────

async function checkPerformerTrust(
  performedBy: string,
  ctx: AssureContext,
): Promise<AssuranceCheck> {
  // Try cached resolve first, then lightweight resolve
  let resolveResult = ctx.getCachedResolve(performedBy);
  if (!resolveResult) {
    try {
      resolveResult = await resolveAgent(
        { agentUrl: performedBy },
        { env: ctx.env, state: ctx.state },
      );
    } catch {
      return { check: "performer-trust-resolution", passed: false, score: 0, reason: "Could not resolve performer trust" };
    }
  }

  const passed = resolveResult.trustScore >= 40 && resolveResult.verdict !== "UNTRUSTED";
  return {
    check: "performer-trust-resolution",
    passed,
    score: resolveResult.trustScore,
    reason: passed
      ? `Performer trust score ${resolveResult.trustScore}, verdict: ${resolveResult.verdict}`
      : `Performer trust too low (${resolveResult.trustScore}) or untrusted (${resolveResult.verdict})`,
  };
}

function checkAttestationHistory(
  performedBy: string,
  taskType: string,
  ctx: AssureContext,
): Promise<AssuranceCheck> {
  const performerLower = performedBy.toLowerCase();
  const taskLower = taskType.toLowerCase();

  const relevant = ctx.state.attestationsReceived.filter((a) => {
    const matchesPerformer =
      a.from.toLowerCase() === performerLower ||
      a.to.toLowerCase() === performerLower;
    const matchesTask = a.category.toLowerCase().includes(taskLower) ||
      taskLower.includes(a.category.toLowerCase());
    return matchesPerformer && matchesTask && a.score >= 60;
  });

  const passed = relevant.length >= 1;
  const bestScore = relevant.length > 0
    ? Math.max(...relevant.map((a) => a.score))
    : 0;

  return Promise.resolve({
    check: "performer-attestation-history",
    passed,
    score: bestScore,
    reason: passed
      ? `Found ${relevant.length} relevant attestation(s) for ${taskType}, best score: ${bestScore}`
      : `No attestations found for ${performedBy} matching ${taskType} with score >= 60`,
  });
}

async function checkCapabilityMatch(
  performedBy: string,
  taskType: string,
): Promise<AssuranceCheck> {
  try {
    const res = await fetch(
      `${performedBy.replace(/\/$/, "")}/.well-known/agent.json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) throw new Error("No agent card");
    const card = (await res.json()) as Record<string, unknown>;
    const capabilities = (Array.isArray(card.capabilities) ? card.capabilities :
      Array.isArray(card.tags) ? card.tags : []) as string[];

    const taskLower = taskType.toLowerCase();
    const match = capabilities.some((c) => {
      const cLower = (c as string).toLowerCase();
      return cLower.includes(taskLower) || taskLower.includes(cLower);
    });

    return {
      check: "capability-match",
      passed: match,
      score: match ? 100 : 0,
      reason: match
        ? `Performer capabilities include match for "${taskType}"`
        : `No capability matching "${taskType}" in agent card (has: ${capabilities.join(", ")})`,
    };
  } catch {
    return { check: "capability-match", passed: false, score: 0, reason: "Could not fetch performer agent card" };
  }
}

async function checkOutputCompleteness(
  artifact: AssureRequest["artifact"],
  expected: AssureRequest["expectedOutcome"],
  level: string,
  env: Env,
): Promise<AssuranceCheck> {
  const outputStr = typeof artifact.output === "string"
    ? artifact.output
    : JSON.stringify(artifact.output);

  if (!outputStr || outputStr === "null" || outputStr === "{}") {
    return { check: "output-completeness", passed: false, score: 0, reason: "Output is empty" };
  }

  const criteria = expected.successCriteria;
  if (!criteria || criteria.length === 0 || level === "quick") {
    return { check: "output-completeness", passed: true, score: 70, reason: "Output is non-empty (no specific criteria to check)" };
  }

  // AI-assisted criteria checking
  try {
    const aiResult = await callAI(env, {
      system:
        "You are evaluating whether a task output meets specific success criteria. " +
        "For each criterion, respond YES or NO. " +
        'Respond as JSON: { "results": [{ "criterion": "...", "met": true/false }] }',
      user: JSON.stringify({
        summary: artifact.summary,
        output: outputStr.slice(0, 2000),
        criteria,
      }),
    });

    const parsed = JSON.parse(aiResult) as { results: { criterion: string; met: boolean }[] };
    const metCount = parsed.results.filter((r) => r.met).length;
    const ratio = metCount / criteria.length;
    const passed = ratio >= 0.5;

    return {
      check: "output-completeness",
      passed,
      score: Math.round(ratio * 100),
      reason: `${metCount}/${criteria.length} success criteria met (${Math.round(ratio * 100)}%)`,
    };
  } catch {
    return { check: "output-completeness", passed: true, score: 50, reason: "Could not AI-verify criteria; output is non-empty" };
  }
}

async function checkOutputConsistency(
  artifact: AssureRequest["artifact"],
  expected: AssureRequest["expectedOutcome"],
  env: Env,
): Promise<AssuranceCheck> {
  try {
    const outputStr = typeof artifact.output === "string"
      ? artifact.output
      : JSON.stringify(artifact.output);

    const aiResult = await callAI(env, {
      system:
        "You are checking if a task output actually addresses the expected outcome. " +
        'Respond with JSON: { "consistent": true/false, "reason": "one sentence" }',
      user: JSON.stringify({
        summary: artifact.summary,
        output: outputStr.slice(0, 2000),
        expectedOutcome: expected.description,
      }),
    });

    const parsed = JSON.parse(aiResult) as { consistent: boolean; reason: string };
    return {
      check: "output-consistency",
      passed: parsed.consistent,
      score: parsed.consistent ? 85 : 20,
      reason: parsed.reason,
    };
  } catch {
    return { check: "output-consistency", passed: false, score: 0, reason: "Could not verify output consistency via AI" };
  }
}

function checkSybilRisk(
  performedBy: string,
  ctx: AssureContext,
): Promise<AssuranceCheck> {
  const resolveResult = ctx.getCachedResolve(performedBy);
  if (resolveResult) {
    const sybil = resolveResult.report.sybilIndicators;
    const clean = !sybil.selfAttestationDetected &&
      sybil.attestationVelocityNormal &&
      sybil.uniqueAttestorRatio >= 0.5;

    return Promise.resolve({
      check: "sybil-risk",
      passed: clean,
      score: clean ? 100 : 20,
      reason: clean
        ? "No sybil indicators detected"
        : `Sybil flags: ${[
          sybil.selfAttestationDetected && "self-attestation",
          !sybil.attestationVelocityNormal && "high velocity",
          sybil.uniqueAttestorRatio < 0.5 && "low attestor diversity",
        ].filter(Boolean).join(", ")}`,
    });
  }

  // No resolve data — check local attestations directly
  const allAtts = ctx.state.attestationsReceived;
  const selfAttest = allAtts.some((a) => a.from === a.to);

  return Promise.resolve({
    check: "sybil-risk",
    passed: !selfAttest,
    score: selfAttest ? 30 : 80,
    reason: selfAttest ? "Self-attestation detected in history" : "No obvious sybil indicators (limited data)",
  });
}

// ── Status logic ───────────────────────────────────────────────

function computeStatus(checks: AssuranceCheck[], confidence: number): AssuranceStatus {
  const checksRan = checks.filter((c) => c.score !== undefined || c.passed !== undefined).length;
  if (checksRan < 3) return "INSUFFICIENT_DATA";

  const critical = ["performer-trust-resolution", "output-consistency", "sybil-risk"];
  const criticalFailed = checks.some((c) => critical.includes(c.check) && !c.passed);
  const totalFailed = checks.filter((c) => !c.passed).length;

  if (criticalFailed || totalFailed >= 2) return "FLAGGED";
  if (totalFailed <= 1 && confidence >= 0.6) return "ASSURED";
  return "FLAGGED";
}
