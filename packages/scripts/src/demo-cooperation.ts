/**
 * Demo Cooperation Flow — 10-step script showing full trust lifecycle
 *
 * Prerequisites:
 *   - TrustVault running on localhost:8787 (npm run dev)
 *   - Peer agent running on localhost:8788 (npm run dev:peer)
 */

const TV_URL = process.env.TRUSTVAULT_URL || "http://localhost:8787";
const PEER_URL = process.env.PEER_URL || "http://localhost:8788";

interface Step {
  name: string;
  fn: () => Promise<unknown>;
}

const steps: Step[] = [
  {
    name: "1. Discover TrustVault agent card",
    fn: () => fetchJson(`${TV_URL}/.well-known/agent.json`),
  },
  {
    name: "2. Discover Peer agent card",
    fn: () => fetchJson(`${PEER_URL}/.well-known/agent.json`),
  },
  {
    name: "3. Check TrustVault health",
    fn: () => fetchJson(`${TV_URL}/health`),
  },
  {
    name: "4. Get TrustVault trust resume (empty)",
    fn: () => fetchJson(`${TV_URL}/trust/resume`),
  },
  {
    name: "5. Peer attests TrustVault (code-review: 85)",
    fn: () =>
      fetchJson(`${TV_URL}/trust/attest`, {
        method: "POST",
        body: {
          targetAddress: "0xTRUST_VAULT_ADDRESS",
          category: "code-review",
          score: 85,
          evidence: "Verified smart contract integration and API design quality.",
        },
      }),
  },
  {
    name: "6. Peer attests TrustVault (reliability: 90)",
    fn: () =>
      fetchJson(`${TV_URL}/trust/attest`, {
        method: "POST",
        body: {
          targetAddress: "0xTRUST_VAULT_ADDRESS",
          category: "reliability",
          score: 90,
          evidence: "Agent maintained 99.9% uptime during 48-hour monitoring period.",
        },
      }),
  },
  {
    name: "7. Get TrustVault trust resume (with attestations)",
    fn: () => fetchJson(`${TV_URL}/trust/resume`),
  },
  {
    name: "8. TrustVault evaluates cooperation with Peer",
    fn: () =>
      fetchJson(`${TV_URL}/trust/cooperate`, {
        method: "POST",
        body: {
          peerAddress: "0xPEER_DEMO_ADDRESS",
          peerUrl: PEER_URL,
          task: "Joint smart contract audit and mutual attestation exchange",
        },
      }),
  },
  {
    name: "9. Chat with TrustVault about its trust profile",
    fn: () =>
      fetchJson(`${TV_URL}/chat`, {
        method: "POST",
        body: {
          message: "Summarize your current trust profile and recent cooperation decisions.",
        },
      }),
  },
  {
    name: "10. Final trust resume snapshot",
    fn: () => fetchJson(`${TV_URL}/trust/resume`),
  },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║   TrustVault v2 — Cooperation Demo               ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  let passed = 0;
  for (const step of steps) {
    console.log(`\n── ${step.name} ──`);
    try {
      const result = await step.fn();
      console.log(JSON.stringify(result, null, 2));
      passed++;
      console.log("✓ OK");
    } catch (e) {
      console.error(`✗ FAILED: ${e}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`Results: ${passed}/${steps.length} steps passed`);
  console.log(`═══════════════════════════════════════════════════`);
}

async function fetchJson(url: string, opts?: { method?: string; body?: unknown }) {
  const res = await fetch(url, {
    method: opts?.method || "GET",
    headers: opts?.body ? { "Content-Type": "application/json" } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

main().catch(console.error);
