/**
 * TrustAgent — Cloudflare Durable Object
 *
 * Persistent, stateful agent that maintains trust resume across requests.
 * Uses Durable Object storage for attestation history, cooperation records,
 * and onchain identity state.
 */
import { DurableObject } from "cloudflare:workers";
import type {
  Env,
  Attestation,
  TrustResume,
  CooperationRecord,
  AgentState,
} from "./types";
import { computeAddress } from "./crypto";
import { callAI } from "./ai";

const DEFAULT_STATE: AgentState = {
  address: "",
  name: "TrustVault",
  attestationsGiven: [],
  attestationsReceived: [],
  cooperationHistory: [],
  onchainRegistered: false,
};

export class TrustAgent extends DurableObject<Env> {
  private state!: AgentState;
  private initialized = false;

  private async init(): Promise<void> {
    if (this.initialized) return;
    const stored = await this.ctx.storage.get<AgentState>("state");
    if (stored) {
      this.state = stored;
    } else {
      const address = computeAddress(this.env.AGENT_PRIVATE_KEY);
      this.state = { ...DEFAULT_STATE, address, name: this.env.AGENT_NAME || "TrustVault" };
      await this.persist();
    }
    this.initialized = true;
  }

  private async persist(): Promise<void> {
    await this.ctx.storage.put("state", this.state);
  }

  // ─── Trust Resume ───

  async getResume(): Promise<TrustResume> {
    await this.init();
    return this.buildResume(this.state);
  }

  async getRemoteResume(address: string): Promise<TrustResume | { error: string }> {
    await this.init();
    // Check if we have attestation data for this address
    const received = this.state.attestationsReceived.filter(
      (a) => a.to.toLowerCase() === address.toLowerCase()
    );
    const given = this.state.attestationsGiven.filter(
      (a) => a.to.toLowerCase() === address.toLowerCase()
    );
    if (received.length === 0 && given.length === 0) {
      return { error: `No trust data found for ${address}` };
    }
    return this.buildResumeFor(address, [...received, ...given]);
  }

  // ─── Attestations ───

  async issueAttestation(params: {
    targetAddress: string;
    category: string;
    score: number;
    evidence?: string;
  }): Promise<{ attestation: Attestation; trustScore: number }> {
    await this.init();

    const attestation: Attestation = {
      id: crypto.randomUUID(),
      from: this.state.address,
      to: params.targetAddress,
      category: params.category,
      score: Math.max(0, Math.min(100, params.score)),
      evidence: params.evidence,
      timestamp: Date.now(),
    };

    this.state.attestationsGiven.push(attestation);
    await this.persist();

    const trustScore = this.computeTrustScore(
      this.state.attestationsReceived.filter(
        (a) => a.to.toLowerCase() === params.targetAddress.toLowerCase()
      )
    );

    return { attestation, trustScore };
  }

  async receiveAttestation(attestation: Attestation): Promise<{ accepted: boolean }> {
    await this.init();
    this.state.attestationsReceived.push(attestation);
    await this.persist();
    return { accepted: true };
  }

  async getAttestations(): Promise<{
    given: Attestation[];
    received: Attestation[];
  }> {
    await this.init();
    return {
      given: this.state.attestationsGiven,
      received: this.state.attestationsReceived,
    };
  }

  async getAttestationsFor(address: string): Promise<Attestation[]> {
    await this.init();
    return [
      ...this.state.attestationsGiven.filter(
        (a) => a.to.toLowerCase() === address.toLowerCase()
      ),
      ...this.state.attestationsReceived.filter(
        (a) => a.from.toLowerCase() === address.toLowerCase()
      ),
    ];
  }

  // ─── Cooperation ───

  async evaluateCooperation(params: {
    peerAddress: string;
    peerUrl: string;
    task: string;
  }): Promise<{
    decision: "accept" | "negotiate" | "decline";
    reason: string;
    peerTrustScore: number;
  }> {
    await this.init();

    // Fetch peer's trust resume
    let peerResume: TrustResume | null = null;
    try {
      const res = await fetch(`${params.peerUrl}/trust/resume`);
      if (res.ok) peerResume = await res.json();
    } catch {
      // Peer unreachable — factor into decision
    }

    const peerTrustScore = peerResume?.trustScore ?? 0;
    const peerAttestations = peerResume?.attestationCount ?? 0;

    // AI-enhanced cooperation decision
    const aiDecision = await callAI(this.env, {
      system:
        "You are TrustVault, a trust-evaluating agent. Given a peer's trust profile and a proposed task, " +
        "decide whether to accept, negotiate, or decline cooperation. Be concise. " +
        "Respond with JSON: { decision, reason }",
      user: JSON.stringify({
        task: params.task,
        peerAddress: params.peerAddress,
        peerTrustScore,
        peerAttestations,
        peerCategories: peerResume?.categories ?? {},
        myTrustScore: this.computeTrustScore(this.state.attestationsReceived),
      }),
    });

    let decision: "accept" | "negotiate" | "decline" = "negotiate";
    let reason = "Defaulting to negotiation.";

    try {
      const parsed = JSON.parse(aiDecision);
      if (["accept", "negotiate", "decline"].includes(parsed.decision)) {
        decision = parsed.decision;
      }
      reason = parsed.reason || reason;
    } catch {
      // Use score-based heuristic as fallback
      if (peerTrustScore >= 70) {
        decision = "accept";
        reason = `Trust score ${peerTrustScore} exceeds acceptance threshold.`;
      } else if (peerTrustScore >= 40) {
        decision = "negotiate";
        reason = `Trust score ${peerTrustScore} is moderate — requesting additional verification.`;
      } else {
        decision = "decline";
        reason = `Trust score ${peerTrustScore} is below minimum threshold.`;
      }
    }

    // Record cooperation decision
    const record: CooperationRecord = {
      peerAddress: params.peerAddress,
      task: params.task,
      decision,
      peerTrustScore,
      timestamp: Date.now(),
    };
    this.state.cooperationHistory.push(record);
    await this.persist();

    return { decision, reason, peerTrustScore };
  }

  async handleCooperationRequest(params: {
    fromAddress: string;
    task: string;
    trustScore: number;
  }): Promise<{
    accepted: boolean;
    counterOffer?: string;
    reason: string;
  }> {
    await this.init();

    if (params.trustScore >= 60) {
      const record: CooperationRecord = {
        peerAddress: params.fromAddress,
        task: params.task,
        decision: "accept",
        peerTrustScore: params.trustScore,
        timestamp: Date.now(),
      };
      this.state.cooperationHistory.push(record);
      await this.persist();
      return { accepted: true, reason: "Trust score meets cooperation threshold." };
    }

    return {
      accepted: false,
      counterOffer: "Provide additional attestations from trusted agents.",
      reason: `Trust score ${params.trustScore} is below our cooperation threshold of 60.`,
    };
  }

  // ─── AI Chat ───

  async chat(message: string): Promise<{ reply: string }> {
    await this.init();
    const resume = await this.getResume();
    const reply = await callAI(this.env, {
      system:
        `You are TrustVault, an autonomous trust-evaluating agent. ` +
        `Your address: ${this.state.address}. Trust score: ${resume.trustScore}. ` +
        `Attestations received: ${resume.attestationCount}. ` +
        `You help agents build verifiable trust profiles using ERC-8004 onchain identity. ` +
        `Be concise, professional, and data-driven.`,
      user: message,
    });
    return { reply };
  }

  // ─── Onchain State ───

  async setOnchainRegistered(txHash: string, tokenId?: string): Promise<void> {
    await this.init();
    this.state.onchainRegistered = true;
    this.state.onchainTxHash = txHash;
    this.state.onchainTokenId = tokenId;
    await this.persist();
  }

  // ─── Internal helpers ───

  private computeTrustScore(attestations: Attestation[]): number {
    if (attestations.length === 0) return 0;

    // Weighted average of attestation scores
    const avgScore =
      attestations.reduce((sum, a) => sum + a.score, 0) / attestations.length;

    // Volume bonus: more attestations = higher confidence (caps at +15)
    const volumeBonus = Math.min(15, attestations.length * 2);

    // Diversity bonus: more categories = more robust profile (caps at +10)
    const categories = new Set(attestations.map((a) => a.category));
    const diversityBonus = Math.min(10, categories.size * 3);

    // Onchain bonus: registered identity adds credibility
    const onchainBonus = this.state.onchainRegistered ? 5 : 0;

    return Math.min(100, Math.round(avgScore + volumeBonus + diversityBonus + onchainBonus));
  }

  private buildResume(state: AgentState): TrustResume {
    const attestations = state.attestationsReceived;
    const categories: Record<string, { avgScore: number; count: number }> = {};

    for (const a of attestations) {
      if (!categories[a.category]) {
        categories[a.category] = { avgScore: 0, count: 0 };
      }
      const cat = categories[a.category];
      cat.avgScore = (cat.avgScore * cat.count + a.score) / (cat.count + 1);
      cat.count++;
    }

    return {
      address: state.address,
      name: state.name,
      trustScore: this.computeTrustScore(attestations),
      attestationCount: attestations.length,
      categories,
      recentAttestations: attestations.slice(-10),
      onchainIdentity: {
        registered: state.onchainRegistered,
        registryAddress: this.env.IDENTITY_REGISTRY || "not-configured",
        tokenId: state.onchainTokenId,
        txHash: state.onchainTxHash,
      },
      cooperationHistory: state.cooperationHistory.slice(-10),
      lastUpdated: Date.now(),
    };
  }

  private buildResumeFor(address: string, attestations: Attestation[]): TrustResume {
    const categories: Record<string, { avgScore: number; count: number }> = {};
    for (const a of attestations) {
      if (!categories[a.category]) {
        categories[a.category] = { avgScore: 0, count: 0 };
      }
      const cat = categories[a.category];
      cat.avgScore = (cat.avgScore * cat.count + a.score) / (cat.count + 1);
      cat.count++;
    }
    return {
      address,
      name: "unknown",
      trustScore: this.computeTrustScore(attestations),
      attestationCount: attestations.length,
      categories,
      recentAttestations: attestations.slice(-10),
      cooperationHistory: [],
      lastUpdated: Date.now(),
    };
  }
}
