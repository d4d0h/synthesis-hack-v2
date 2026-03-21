/** Cloudflare Worker environment bindings */
export interface Env {
  // Durable Objects
  TRUST_AGENT: DurableObjectNamespace;

  // AI / Model providers
  GROQ_API_KEY: string;
  ANTHROPIC_API_KEY?: string;
  VENICE_API_KEY?: string;
  OPENROUTER_API_KEY?: string;

  // Ethereum / ERC-8004
  AGENT_PRIVATE_KEY: string;
  CHAIN_RPC_URL: string;
  CHAIN_ID: string;
  IDENTITY_REGISTRY: string;
  REPUTATION_REGISTRY: string;

  // Agent config
  AGENT_NAME: string;

  // Synthesis
  SYNTH_API_KEY?: string;
}

/** Cooperation decision options */
export type CooperationDecision = "accept" | "negotiate" | "decline";

/** An attestation record */
export interface Attestation {
  id: string;
  from: string;
  to: string;
  category: string;
  score: number; // 0-100
  evidence?: string;
  timestamp: number;
  txHash?: string;
}

/** Trust resume — the portable reputation profile */
export interface TrustResume {
  address: string;
  name: string;
  trustScore: number;
  totalAttestationCount: number;
  categories: Record<string, { avgScore: number; count: number }>;
  recentAttestations: Attestation[];
  onchainIdentity?: {
    registered: boolean;
    registryAddress: string;
    tokenId?: string;
    txHash?: string;
  };
  cooperationHistory: CooperationRecord[];
  lastUpdated: number;
}

/** Record of a cooperation decision */
export interface CooperationRecord {
  peerAddress: string;
  task: string;
  decision: CooperationDecision;
  peerTrustScore: number;
  timestamp: number;
}

/** Agent memory stored in Durable Object */
export interface AgentState {
  address: string;
  name: string;
  attestationsGiven: Attestation[];
  attestationsReceived: Attestation[];
  cooperationHistory: CooperationRecord[];
  onchainRegistered: boolean;
  onchainTxHash?: string;
  onchainTokenId?: string;
  resolveCache: Record<string, CachedResolution>;
  resolutionLog: ResolutionLogEntry[];
}

// ── Resolution types ────────────────────────────────────────────────────

export type Verdict = "TRUSTED" | "CAUTIOUS" | "UNTRUSTED" | "UNKNOWN";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface ResolveRequest {
  agentUrl: string;
  task?: {
    type: string;
    description?: string;
    riskLevel: RiskLevel;
    requiredCapabilities: string[];
    valueAtStake?: string;
  };
}

export interface TaskFit {
  capabilityMatch: string[];
  capabilityGap: string[];
  riskAssessment: RiskLevel;
  safeguards: string[];
}

export interface IdentityReport {
  reachable: boolean;
  hasAgentCard: boolean;
  name: string | null;
  capabilities: string[];
  erc8004Registered: boolean;
}

export interface SybilIndicators {
  selfAttestationDetected: boolean;
  attestationVelocityNormal: boolean;
  uniqueAttestorRatio: number;
}

export interface ResolutionReceipt {
  id: string;
  resolvedAt: string;
  expiresAt: string;
  resolver: string;
  targetAgent: string;
  digest: string;
}

export interface ResolveResult {
  verdict: Verdict;
  confidence: number;
  trustScore: number;
  taskFit: TaskFit;
  report: {
    identity: IdentityReport;
    onchainReputation: { feedbackCount: number; averageScore: number };
    localTrust: { directAttestations: number; averageScore: number; categories: string[] };
    sybilIndicators: SybilIndicators;
    reasoning: string;
  };
  receipt: ResolutionReceipt;
}

export interface CachedResolution {
  result: ResolveResult;
  expiresAt: string;
}

export interface ResolutionLogEntry {
  id: string;
  targetAgent: string;
  verdict: Verdict;
  trustScore: number;
  task?: string;
  timestamp: string;
}
