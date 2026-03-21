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
  CooperationDecision,
  AgentState,
} from "./types";
import { computeAddress } from "./crypto";
import { callAI } from "./ai";

const MAX_ATTESTATIONS = 500;
const MAX_COOPERATION_RECORDS = 200;

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

  /** Cap arrays to prevent exceeding DO storage limits */
  private trimArrays(): void {
    if (this.state.attestationsGiven.length > MAX_ATTESTATIONS) {
      this.state.attestationsGiven = this.state.attestationsGiven.slice(-MAX_ATTESTATIONS);
    }
    if (this.state.attestationsReceived.length > MAX_ATTESTATIONS) {
      this.state.attestationsReceived = this.state.attestationsReceived.slice(-MAX_ATTESTATIONS);
    }
    if (this.state.cooperationHistory.length > MAX_COOPERATION_RECORDS) {
      this.state.cooperationHistory = this.state.cooperationHistory.slice(-MAX_COOPERATION_RECORDS);
    }
  }

  async getResume(): Promise<TrustResume> {
    await this.init();
    return this.buildResume(this.state.address, this.state.name, this.state.attestationsReceived, {
      onchainIdentity: {
        registered: this.state.onchainRegistered,
        registryAddress: this.env.IDENTITY_REGISTRY || "not-configured",
        tokenId: this.state.onchainTokenId,
        txHash: this.state.onchainTxHash,
      },
      cooperationHistory: this.state.cooperationHistory.slice(-10),
    });
  }

  async getRemoteResume(address: string): Promise<TrustResume | { error: string }> {
    await this.init();
    const addr = address.toLowerCase();
    const attestations = [
      ...this.state.attestationsReceived.filter((a) => a.to === addr),
      ...this.state.attestationsGiven.filter((a) => a.to === addr),
    ];
    if (attestations.length === 0) {
      return { error: `No trust data found for ${address}` };
    }
    return this.buildResume(address, "unknown", attestations);
  }

  /**
   * Handle an attestation — routes to given or received based on context.
   * If fromAddress is provided and targetAddress is this agent, it's incoming (received).
   * Otherwise it's outgoing (given by this agent about someone else).
   */
  async handleAttestation(params: {
    targetAddress: string;
    fromAddress?: string;
    category: string;
    score: number;
    evidence?: string;
  }): Promise<{ attestation: Attestation; trustScore: number; direction: "given" | "received" }> {
    await this.init();

    const targetAddr = params.targetAddress.toLowerCase();
    const isIncoming = targetAddr === this.state.address.toLowerCase();
    const fromAddr = (params.fromAddress || this.state.address).toLowerCase();

    const attestation: Attestation = {
      id: crypto.randomUUID(),
      from: isIncoming ? fromAddr : this.state.address,
      to: targetAddr,
      category: params.category,
      score: Math.max(0, Math.min(100, params.score)),
      evidence: params.evidence,
      timestamp: Date.now(),
    };

    if (isIncoming) {
      this.state.attestationsReceived.push(attestation);
    } else {
      this.state.attestationsGiven.push(attestation);
    }
    this.trimArrays();
    await this.persist();

    const trustScore = this.computeTrustScore(this.state.attestationsReceived);

    return { attestation, trustScore, direction: isIncoming ? "received" : "given" };
  }

  async receiveAttestation(attestation: Attestation): Promise<{ accepted: boolean }> {
    await this.init();
    attestation.from = attestation.from.toLowerCase();
    attestation.to = attestation.to.toLowerCase();
    this.state.attestationsReceived.push(attestation);
    this.trimArrays();
    await this.persist();
    return { accepted: true };
  }

  async getAttestations(): Promise<{ given: Attestation[]; received: Attestation[] }> {
    await this.init();
    return {
      given: this.state.attestationsGiven,
      received: this.state.attestationsReceived,
    };
  }

  async getAttestationsFor(address: string): Promise<Attestation[]> {
    await this.init();
    const addr = address.toLowerCase();
    return [
      ...this.state.attestationsGiven.filter((a) => a.to === addr),
      ...this.state.attestationsReceived.filter((a) => a.from === addr),
    ];
  }

  async evaluateCooperation(params: {
    peerAddress: string;
    peerUrl: string;
    task: string;
  }): Promise<{
    decision: CooperationDecision;
    reason: string;
    peerTrustScore: number;
  }> {
    await this.init();

    let peerResume: TrustResume | null = null;
    try {
      const res = await fetch(`${params.peerUrl}/trust/resume`);
      if (res.ok) peerResume = await res.json();
    } catch {
      // Peer unreachable
    }

    const peerTrustScore = peerResume?.trustScore ?? 0;

    // AI-enhanced cooperation decision
    let decision: CooperationDecision = "negotiate";
    let reason = "Defaulting to negotiation.";

    try {
      const aiDecision = await callAI(this.env, {
        system:
          "You are TrustVault, a trust-evaluating agent. Given a peer's trust profile and a proposed task, " +
          "decide whether to accept, negotiate, or decline cooperation. Be concise. " +
          'Respond with JSON: { "decision": "accept"|"negotiate"|"decline", "reason": "..." }',
        user: JSON.stringify({
          task: params.task,
          peerAddress: params.peerAddress,
          peerTrustScore,
          peerAttestations: peerResume?.totalAttestationCount ?? 0,
          peerCategories: peerResume?.categories ?? {},
          myTrustScore: this.computeTrustScore(this.state.attestationsReceived),
        }),
      });

      const parsed = JSON.parse(aiDecision);
      if (["accept", "negotiate", "decline"].includes(parsed.decision)) {
        decision = parsed.decision;
      }
      reason = parsed.reason || reason;
    } catch {
      // Score-based heuristic fallback
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

    this.recordCooperation(params.peerAddress, params.task, decision, peerTrustScore);
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

    const decision: CooperationDecision = params.trustScore >= 60 ? "accept" : "decline";
    this.recordCooperation(params.fromAddress, params.task, decision, params.trustScore);
    await this.persist();

    if (decision === "accept") {
      return { accepted: true, reason: "Trust score meets cooperation threshold." };
    }

    return {
      accepted: false,
      counterOffer: "Provide additional attestations from trusted agents.",
      reason: `Trust score ${params.trustScore} is below our cooperation threshold of 60.`,
    };
  }

  async chat(message: string): Promise<{ reply: string }> {
    await this.init();
    const trustScore = this.computeTrustScore(this.state.attestationsReceived);
    const attestationCount = this.state.attestationsReceived.length;
    try {
      const reply = await callAI(this.env, {
        system:
          `You are TrustVault, an autonomous trust-evaluating agent. ` +
          `Your address: ${this.state.address}. Trust score: ${trustScore}. ` +
          `Attestations received: ${attestationCount}. ` +
          `You help agents build verifiable trust profiles using ERC-8004 onchain identity. ` +
          `Be concise, professional, and data-driven.`,
        user: message,
      });
      return { reply };
    } catch {
      return {
        reply: `I'm TrustVault. My trust score is ${trustScore} with ${attestationCount} attestations received. ` +
          `AI provider not configured — operating in data-only mode.`,
      };
    }
  }

  async setOnchainRegistered(txHash: string, tokenId?: string): Promise<void> {
    await this.init();
    this.state.onchainRegistered = true;
    this.state.onchainTxHash = txHash;
    this.state.onchainTokenId = tokenId;
    await this.persist();
  }

  private recordCooperation(
    peerAddress: string,
    task: string,
    decision: CooperationDecision,
    peerTrustScore: number,
  ): void {
    this.state.cooperationHistory.push({
      peerAddress,
      task,
      decision,
      peerTrustScore,
      timestamp: Date.now(),
    });
    this.trimArrays();
  }

  private computeTrustScore(attestations: Attestation[]): number {
    if (attestations.length === 0) return 0;

    const avgScore =
      attestations.reduce((sum, a) => sum + a.score, 0) / attestations.length;
    const volumeBonus = Math.min(15, attestations.length * 2);
    const categories = new Set(attestations.map((a) => a.category));
    const diversityBonus = Math.min(10, categories.size * 3);
    const onchainBonus = this.state.onchainRegistered ? 5 : 0;

    return Math.min(100, Math.round(avgScore + volumeBonus + diversityBonus + onchainBonus));
  }

  private aggregateCategories(
    attestations: Attestation[]
  ): Record<string, { avgScore: number; count: number }> {
    const categories: Record<string, { avgScore: number; count: number }> = {};
    for (const a of attestations) {
      if (!categories[a.category]) {
        categories[a.category] = { avgScore: 0, count: 0 };
      }
      const cat = categories[a.category];
      cat.avgScore = (cat.avgScore * cat.count + a.score) / (cat.count + 1);
      cat.count++;
    }
    return categories;
  }

  private buildResume(
    address: string,
    name: string,
    attestations: Attestation[],
    extras?: {
      onchainIdentity?: TrustResume["onchainIdentity"];
      cooperationHistory?: CooperationRecord[];
    },
  ): TrustResume {
    return {
      address,
      name,
      trustScore: this.computeTrustScore(attestations),
      totalAttestationCount: attestations.length,
      categories: this.aggregateCategories(attestations),
      recentAttestations: attestations.slice(-10),
      onchainIdentity: extras?.onchainIdentity,
      cooperationHistory: extras?.cooperationHistory ?? [],
      lastUpdated: Date.now(),
    };
  }
}
