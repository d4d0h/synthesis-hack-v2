import type { Env } from "./types";

/**
 * ERC-8004 / A2A Agent Card
 * Served at /.well-known/agent.json for agent discovery
 */
export function agentCard(env: Env) {
  return {
    name: "TrustVault",
    description:
      "An autonomous agent that builds and maintains verifiable trust profiles for the agent economy. " +
      "Issues and receives onchain attestations, computes trust scores, and makes cooperation decisions " +
      "based on portable, verifiable reputation.",
    version: "2.0.0",
    protocol: "a2a",
    capabilities: [
      "erc8004-identity",
      "attestation-issuing",
      "attestation-receiving",
      "trust-scoring",
      "cooperation-evaluation",
      "reputation-query",
    ],
    endpoints: {
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
      chainId: parseInt(env.CHAIN_ID || "11155111"),
      registryAddress: env.IDENTITY_REGISTRY || "not-configured",
    },
    model: {
      primary: "claude-opus-4-6",
      budget: "minimax-m2.7",
      reasoning: "anthropic",
    },
    tags: [
      "trust",
      "reputation",
      "erc-8004",
      "attestation",
      "cooperation",
      "synthesis-hackathon",
    ],
  };
}
