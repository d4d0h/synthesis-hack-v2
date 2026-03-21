import type { Env } from "./types";

/**
 * ERC-8004 / A2A Agent Card
 * Served at /.well-known/agent.json for agent discovery
 */
export function agentCard(env: Env) {
  return {
    name: "TrustVault",
    description:
      "Open Trust Resolution Protocol for the agent economy. " +
      "Give it any agent URL and a task — it returns whether cooperation is safe, why, and under what constraints. " +
      "Computes verdicts from on-chain ERC-8004 state, local attestation history, sybil analysis, and AI reasoning. " +
      "Returns signed receipts so agents can prove they resolved trust before cooperating.",
    version: "2.1.0",
    protocol: "a2a",
    capabilities: [
      "trust-resolution",
      "task-aware-verdict",
      "signed-receipt",
      "sybil-detection",
      "erc8004-identity",
      "attestation-issuing",
      "attestation-receiving",
      "trust-scoring",
      "cooperation-evaluation",
      "reputation-query",
    ],
    tools: [
      {
        name: "resolve_agent_trust",
        description:
          "Universal trust resolution — send an agent URL + task context, " +
          "get a verdict (TRUSTED/CAUTIOUS/UNTRUSTED/UNKNOWN), capability gap analysis, " +
          "risk-adjusted safeguards, and a signed receipt",
      },
    ],
    endpoints: {
      resolve: "/resolve",
      resolutionLog: "/resolution-log",
      health: "/health",
      agentCard: "/.well-known/agent.json",
      trustResume: "/trust/resume",
      attest: "/trust/attest",
      attestations: "/trust/attestations",
      cooperate: "/trust/cooperate",
      cooperateAccept: "/trust/cooperate/accept",
      chat: "/chat",
      erc8004Register: "/erc8004/register",
      erc8004Reputation: "/erc8004/reputation",
    },
    identity: {
      standard: "ERC-8004",
      chain: "sepolia",
      chainId: parseInt(env.CHAIN_ID || "11155111", 10),
      registryAddress: env.IDENTITY_REGISTRY || "not-configured",
    },
    model: {
      primary: "llama-3.3-70b-versatile",
      budget: "llama-3.3-70b-versatile",
      reasoning: "groq",
    },
    tags: [
      "trust",
      "reputation",
      "erc-8004",
      "attestation",
      "cooperation",
      "trust-resolution",
      "synthesis-hackathon",
    ],
  };
}
