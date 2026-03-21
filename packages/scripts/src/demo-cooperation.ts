/**
 * Demo Cooperation Flow — 10-step script showing full trust lifecycle
 *
 * Prerequisites:
 *   - TrustVault running on localhost:8787 (npm run dev)
 *   - Peer agent running on localhost:8788 (npm run dev:peer)
 */

const TV_URL = process.env.TRUSTVAULT_URL || "http://localhost:8787";
const PEER_URL = process.env.PEER_URL || "http://localhost:8788";

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║   TrustVault v2 — Cooperation Demo               ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  let passed = 0;
  const total = 10;

  // Step 1-2: Discover both agents in parallel
  const [tvCard, peerCard] = await Promise.all([
    runStep("1. Discover TrustVault agent card", () => fetchJson(`${TV_URL}/.well-known/agent.json`)),
    runStep("2. Discover Peer agent card", () => fetchJson(`${PEER_URL}/.well-known/agent.json`)),
  ]);
  if (tvCard.ok) passed++;
  if (peerCard.ok) passed++;

  // Step 3-4: Health + initial resume in parallel
  const [health, initialResume] = await Promise.all([
    runStep("3. Check TrustVault health", () => fetchJson(`${TV_URL}/health`)),
    runStep("4. Get TrustVault trust resume (initial)", () => fetchJson(`${TV_URL}/trust/resume`)),
  ]);
  if (health.ok) passed++;
  if (initialResume.ok) passed++;

  // Extract TrustVault's real address for attestations
  const tvAddress = (initialResume.result as { address?: string })?.address || "";
  if (!tvAddress) {
    console.error("\n✗ Could not determine TrustVault address — cannot continue demo.");
    return;
  }
  console.log(`\n  TrustVault address: ${tvAddress}\n`);

  // Step 5-6: Issue attestations (sequential — both target same agent)
  const attest1 = await runStep("5. Peer attests TrustVault (code-review: 85)", () =>
    fetchJson(`${TV_URL}/trust/attest`, {
      method: "POST",
      body: {
        targetAddress: tvAddress,
        category: "code-review",
        score: 85,
        evidence: "Verified smart contract integration and API design quality.",
      },
    })
  );
  if (attest1.ok) passed++;

  const attest2 = await runStep("6. Peer attests TrustVault (reliability: 90)", () =>
    fetchJson(`${TV_URL}/trust/attest`, {
      method: "POST",
      body: {
        targetAddress: tvAddress,
        category: "reliability",
        score: 90,
        evidence: "Agent maintained 99.9% uptime during 48-hour monitoring period.",
      },
    })
  );
  if (attest2.ok) passed++;

  // Step 7: Check resume with attestations
  const updatedResume = await runStep("7. Get TrustVault trust resume (with attestations)", () =>
    fetchJson(`${TV_URL}/trust/resume`)
  );
  if (updatedResume.ok) passed++;

  // Get peer address for cooperation
  const peerResume = await fetchJson(`${PEER_URL}/trust/resume`).catch(() => null) as { address?: string } | null;
  const peerAddress = peerResume?.address || "0x00000000000000000000000000000000deadbeef";

  // Step 8: Cooperation evaluation
  const coop = await runStep("8. TrustVault evaluates cooperation with Peer", () =>
    fetchJson(`${TV_URL}/trust/cooperate`, {
      method: "POST",
      body: {
        peerAddress,
        peerUrl: PEER_URL,
        task: "Joint smart contract audit and mutual attestation exchange",
      },
    })
  );
  if (coop.ok) passed++;

  // Step 9: Chat
  const chat = await runStep("9. Chat with TrustVault about its trust profile", () =>
    fetchJson(`${TV_URL}/chat`, {
      method: "POST",
      body: {
        message: "Summarize your current trust profile and recent cooperation decisions.",
      },
    })
  );
  if (chat.ok) passed++;

  // Step 10: Final snapshot
  const final = await runStep("10. Final trust resume snapshot", () =>
    fetchJson(`${TV_URL}/trust/resume`)
  );
  if (final.ok) passed++;

  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`Results: ${passed}/${total} steps passed`);
  console.log(`═══════════════════════════════════════════════════`);
}

async function runStep(name: string, fn: () => Promise<unknown>): Promise<{ ok: boolean; result: unknown }> {
  console.log(`\n── ${name} ──`);
  try {
    const result = await fn();
    console.log(JSON.stringify(result, null, 2));
    console.log("✓ OK");
    return { ok: true, result };
  } catch (e) {
    console.error(`✗ FAILED: ${e}`);
    return { ok: false, result: null };
  }
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
