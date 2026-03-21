/**
 * TrustVault v2.1 — Full Demo Script
 *
 * Shows the complete trust lifecycle including the new resolution engine:
 *   Steps 1-10: Original cooperation flow
 *   Steps 11-13: Trust resolution with task-aware verdicts + signed receipts
 *
 * Prerequisites:
 *   - TrustVault running on localhost:8787 (npm run dev) or deployed
 *   - Peer agent running on localhost:8788 (npm run dev:peer) or deployed
 */

const TV_URL = process.env.TRUSTVAULT_URL || "http://localhost:8787";
const PEER_URL = process.env.PEER_URL || "http://localhost:8788";

async function main() {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║   TrustVault v2.1 — Trust Resolution Demo        ║");
  console.log("╚═══════════════════════════════════════════════════╝\n");

  let passed = 0;
  const total = 13;

  // Step 1-2: Discover both agents
  const [tvCard, peerCard] = await Promise.all([
    runStep("1. Discover TrustVault agent card", () => fetchJson(`${TV_URL}/.well-known/agent.json`)),
    runStep("2. Discover Peer agent card", () => fetchJson(`${PEER_URL}/.well-known/agent.json`)),
  ]);
  if (tvCard.ok) passed++;
  if (peerCard.ok) passed++;

  // Step 3-4: Health + initial resume
  const [health, initialResume] = await Promise.all([
    runStep("3. Check TrustVault health", () => fetchJson(`${TV_URL}/health`)),
    runStep("4. Get TrustVault trust resume (initial)", () => fetchJson(`${TV_URL}/trust/resume`)),
  ]);
  if (health.ok) passed++;
  if (initialResume.ok) passed++;

  const tvAddress = (initialResume.result as { address?: string })?.address || "";
  if (!tvAddress) {
    console.error("\n✗ Could not determine TrustVault address — cannot continue.");
    return;
  }
  console.log(`\n  TrustVault address: ${tvAddress}\n`);

  // Step 5-6: Issue attestations
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

  // Step 7: Updated resume
  const updatedResume = await runStep("7. Get TrustVault trust resume (with attestations)", () =>
    fetchJson(`${TV_URL}/trust/resume`)
  );
  if (updatedResume.ok) passed++;

  // Step 8: Cooperation evaluation
  const peerResume = await fetchJson(`${PEER_URL}/trust/resume`).catch(() => null) as { address?: string } | null;
  const peerAddress = peerResume?.address || "0x00000000000000000000000000000000deadbeef";

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
  const chat = await runStep("9. Chat with TrustVault", () =>
    fetchJson(`${TV_URL}/chat`, {
      method: "POST",
      body: { message: "What is your trust resolution protocol and how does it work?" },
    })
  );
  if (chat.ok) passed++;

  // Step 10: Snapshot
  const snapshot = await runStep("10. Trust resume snapshot", () =>
    fetchJson(`${TV_URL}/trust/resume`)
  );
  if (snapshot.ok) passed++;

  // ─── NEW: Trust Resolution Steps ────────────────────────────

  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║   Trust Resolution Protocol (v2.1)               ║");
  console.log("╚═══════════════════════════════════════════════════╝");

  // Step 11: Resolve trust for Peer (no task — general)
  const resolve1 = await runStep("11. Resolve trust for Peer (general — no task context)", () =>
    fetchJson(`${TV_URL}/resolve`, {
      method: "POST",
      body: { agentUrl: PEER_URL },
    })
  );
  if (resolve1.ok) passed++;

  // Step 12: Resolve trust for Peer (with task context)
  const resolve2 = await runStep("12. Resolve trust for Peer (task: high-risk data-analysis)", () =>
    fetchJson(`${TV_URL}/resolve`, {
      method: "POST",
      body: {
        agentUrl: PEER_URL,
        task: {
          type: "data-analysis",
          description: "Analyze market trends and generate investment recommendations",
          riskLevel: "high",
          requiredCapabilities: ["market-research", "statistical-modeling", "risk-assessment"],
          valueAtStake: "5000 USDC",
        },
      },
    })
  );
  if (resolve2.ok) passed++;

  // Step 13: Show resolution receipt as proof
  const resolve2Result = resolve2.result as { receipt?: { id: string; digest: string; resolvedAt: string } } | null;
  const receipt = resolve2Result?.receipt;
  const step13 = await runStep("13. Signed receipt — proof of trust resolution", async () => {
    if (!receipt) throw new Error("No receipt from step 12");
    return {
      proof: "This receipt can be passed to any third-party agent as proof that TrustVault resolved trust.",
      receipt,
      verification: `To verify: SHA-256("${receipt.id}:<verdict>:<score>:${receipt.resolvedAt}") === ${receipt.digest}`,
    };
  });
  if (step13.ok) passed++;

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
