import type { Env } from "./types";

/**
 * ERC-8004 / A2A Agent Card
 * Served at /.well-known/agent.json for agent discovery
 */
export function agentCard(env: Env) {
  return {
    name: "TrustVault",
    description:
      "Open Trust Resolution Protocol + Outcome Assurance for the agent economy. " +
      "/resolve: pre-task — is cooperation safe? /assure: post-task — is the result reliable? " +
      "Computes verdicts from on-chain ERC-8004 state, attestation history, sybil analysis, and AI reasoning. " +
      "Both return signed certificates as proof.",
    version: "2.2.0",
    protocol: "a2a",
    capabilities: [
      "trust-resolution",
      "outcome-assurance",
      "task-aware-verdict",
      "signed-receipt",
      "signed-certificate",
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
          "Pre-task trust resolution — send an agent URL + task context, " +
          "get a verdict (TRUSTED/CAUTIOUS/UNTRUSTED/UNKNOWN), capability gap analysis, " +
          "risk-adjusted safeguards, and a signed receipt",
      },
      {
        name: "assure_outcome",
        description:
          "Post-task outcome assurance — send a task result + performer URL, " +
          "get 6-check verification (ASSURED/FLAGGED/INSUFFICIENT_DATA) with " +
          "trust cross-ref, capability match, output consistency, sybil check, " +
          "and a signed certificate",
      },
    ],
    endpoints: {
      resolve: "/resolve",
      resolutionLog: "/resolution-log",
      assure: "/assure",
      assuranceLog: "/assurance-log",
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
