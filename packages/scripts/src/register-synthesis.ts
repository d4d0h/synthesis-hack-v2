/**
 * Register with Synthesis Hackathon
 *
 * Interactive script that walks through the 3-phase registration:
 *   Phase 1: POST /register/init → pendingId
 *   Phase 2: Verify (email OTP or Twitter)
 *   Phase 3: POST /register/complete → apiKey + on-chain identity
 *
 * Usage: npx tsx src/register-synthesis.ts
 */
import "dotenv/config";

const BASE_URL = "https://synthesis.devfolio.co";

async function main() {
  console.log("╔═══════════════════════════════════════════════╗");
  console.log("║   Synthesis Hackathon — Agent Registration     ║");
  console.log("╚═══════════════════════════════════════════════╝\n");

  // Check for existing API key
  if (process.env.SYNTH_API_KEY) {
    console.log("SYNTH_API_KEY already set in .env");
    console.log("If you need to re-register, remove it first.");
    return;
  }

  // Phase 1: Init registration
  console.log("Phase 1: Initiating registration...\n");

  const initPayload = {
    name: "TrustVault",
    description:
      "An autonomous agent that builds and maintains verifiable trust profiles " +
      "for the agent economy. Uses ERC-8004 onchain identity and attestations " +
      "to create portable, queryable reputation that other agents use for " +
      "cooperation decisions.",
    agentHarness: "claude-code",
    model: "claude-opus-4-6",
    humanInfo: {
      name: "Raul Calvo",
      email: "raul@unbrained.club",
      socialMediaHandle: "",   // ← Optional
      background: "builder",
      cryptoExperience: "yes",
      aiAgentExperience: "yes",
      codingComfort: 9,
      problemToSolve:
        "Building the trust infrastructure that lets autonomous agents decide " +
        "who to cooperate with — no central authority needed. Using ERC-8004 " +
        "for verifiable, portable agent reputation.",
    },
  };

  // Check if humanInfo is filled in
  if (initPayload.humanInfo.name === "FILL_IN" || initPayload.humanInfo.email === "FILL_IN") {
    console.log("Before running this script, edit the humanInfo in this file:");
    console.log("  - name: your full name");
    console.log("  - email: your email address");
    console.log("  - socialMediaHandle: your Twitter/X handle (optional)");
    console.log("\nOr set environment variables:");
    console.log("  HUMAN_NAME, HUMAN_EMAIL, HUMAN_SOCIAL");

    // Try env vars
    if (process.env.HUMAN_NAME && process.env.HUMAN_EMAIL) {
      initPayload.humanInfo.name = process.env.HUMAN_NAME;
      initPayload.humanInfo.email = process.env.HUMAN_EMAIL;
      initPayload.humanInfo.socialMediaHandle = process.env.HUMAN_SOCIAL || "";
      console.log("\nUsing environment variables.");
    } else {
      process.exit(1);
    }
  }

  console.log(`Registering as: ${initPayload.name}`);
  console.log(`Human: ${initPayload.humanInfo.name} (${initPayload.humanInfo.email})\n`);

  const initRes = await fetch(`${BASE_URL}/register/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(initPayload),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    console.error(`Registration init failed (${initRes.status}): ${err}`);
    process.exit(1);
  }

  const { pendingId, message } = (await initRes.json()) as {
    pendingId: string;
    message: string;
  };

  console.log(`pendingId: ${pendingId}`);
  console.log(`Message: ${message}\n`);

  // Phase 2: Request email OTP
  console.log("Phase 2: Sending email verification OTP...\n");

  const otpRes = await fetch(`${BASE_URL}/register/verify/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingId }),
  });

  if (!otpRes.ok) {
    const err = await otpRes.text();
    console.error(`OTP send failed (${otpRes.status}): ${err}`);
    process.exit(1);
  }

  console.log("OTP sent to your email!");
  console.log("Check your inbox and run this command to complete:\n");
  console.log(`  curl -X POST ${BASE_URL}/register/verify/email/confirm \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"pendingId": "${pendingId}", "otp": "YOUR_CODE"}'\n`);
  console.log("Then complete registration:\n");
  console.log(`  curl -X POST ${BASE_URL}/register/complete \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -d '{"pendingId": "${pendingId}"}'\n`);
  console.log("Save the apiKey from the response in your .env as SYNTH_API_KEY");
}

main().catch(console.error);
