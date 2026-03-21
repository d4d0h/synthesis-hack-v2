/** Cloudflare Worker environment bindings */
export interface Env {
  // Durable Objects
  TRUST_AGENT: DurableObjectNamespace;

  // AI / Model providers
  ANTHROPIC_API_KEY: string;
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
  attestationCount: number;
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
  decision: "accept" | "negotiate" | "decline";
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
}
