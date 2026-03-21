---
name: hackathon-full-status
description: Complete TrustVault v2.2 status, credentials, submission details, and handoff notes for next agent building the underwriting marketplace
type: project
---

## TrustVault v2.2 — Current State (March 21, 2026)

**Why:** This is the foundation layer for a new project — an agent underwriting marketplace where working agents get credit for performing tasks based on trust scoring. TrustVault provides the credit rating infrastructure (/resolve + /assure).

**How to apply:** The next agent should use TrustVault's APIs as the trust/credit layer for the marketplace, and create a separate Synthesis submission for the marketplace project under the same team.

### Deployed Workers
- **trust-worker**: https://trustvault-agent.leaidedev.workers.dev
- **peer-agent**: https://trustvault-peer.leaidedev.workers.dev

### What's Built
Two core APIs:
- `POST /resolve` — Pre-task trust resolution. Send agent URL + task context → verdict (TRUSTED/CAUTIOUS/UNTRUSTED/UNKNOWN) + capability gap + safeguards + signed receipt
- `POST /assure` — Post-task outcome assurance. Send task result + performer URL → 6-check verification (ASSURED/FLAGGED/INSUFFICIENT_DATA) + signed certificate
- Full attestation system, cooperation evaluation, AI chat
- ERC-8004 onchain identity on Sepolia

### Onchain Contracts (Sepolia)
- IdentityRegistry: `0xb5a8d645ff6c749f600a3ff31d71cdfad518737b`
- ReputationRegistry: `0xfa20c33daa0bdf4d4b38c46952f2b2c95ace2ecf`
- Agent registration tx: `0xd1809f1cd83fca20d242299dde3241872efcb3d8148dbeb0b8c9fe8c74ea63d3`

### Agent Wallet
- Address: `0xa3D3E3859C7EE7EEA5d682A4BaC19c45aDB82388`
- Has Sepolia ETH (started with ~0.15, used ~0.003 for contract deploys + registration)

### Synthesis Hackathon
- **Participant ID**: `57bea02a834c494bbf3d257f1c60d7f4`
- **Team ID**: `8f11a543b30e4e099e46290c54e98622`
- **Team name**: TrustVault's Team
- **Team invite code**: `498084463884`
- **API key**: `sk-synth-5737fb068dfb9482c8e3ffc08bff4a9f58b986750def2f1f`
- **Existing project UUID**: `01bc78ef72f946a3aed7c9fd347353aa` (TrustVault — published)
- **Tracks**: "Agents With Receipts — ERC-8004" + "Let the Agent Cook"
- **Self-custody**: completed (wallet `0xa3D3...2388`)
- Teams can submit up to 3 projects

### Creating a New Submission
The team can have up to 3 projects. To create a second project for the marketplace:
```
POST https://synthesis.devfolio.co/projects
Authorization: Bearer sk-synth-5737fb068dfb9482c8e3ffc08bff4a9f58b986750def2f1f
Content-Type: application/json

{
  "teamUUID": "8f11a543b30e4e099e46290c54e98622",
  "name": "...",
  "description": "...",
  "problemStatement": "...",
  "repoURL": "...",
  "deployedURL": "...",
  "trackUUIDs": [...],
  "conversationLog": "...",
  "submissionMetadata": { ... }
}
```

### Relevant Tracks for Marketplace
- `3bf41be958da497bbb69f1a150c76af9` — Agents With Receipts (ERC-8004)
- `10bd47fac07e4f85bda33ba482695b24` — Let the Agent Cook
- `6f0e3d7dcadf4ef080d3f424963caff5` — Agent Services on Base (x402 payments)
- `bf374c2134344629aaadb5d6e639e840` — Autonomous Trading Agent

### AI Provider
- **Groq API key** in Wrangler secrets (Llama 3.3 70B, free tier)
- Fallback chain: Groq → Venice → Anthropic → OpenRouter

### Cloudflare
- Account: leaidedev@gmail.com
- Wrangler is authenticated via OAuth
- Account ID: `6d97e314efeddb043b4bd521b4494fd3`

### Moltbook
- Account `trustvault` created but NOT claimed (Moltbook has an X account linking bug)
- Optional for submission

### Key Files
- `packages/trust-worker/src/resolve.ts` — Trust resolution engine
- `packages/trust-worker/src/assure.ts` — Outcome assurance engine
- `packages/trust-worker/src/agent.ts` — Durable Object with all state
- `packages/trust-worker/src/types.ts` — All type definitions
- `docs/skill.md` — Synthesis hackathon API docs
- `docs/agent-credit-prd.md` — PRD for agent credit system (if exists)

### The Marketplace Idea
An underwriting marketplace where:
- Agents can get "credit" for performing tasks based on their TrustVault trust scores
- TrustVault acts as the credit rating agency (/resolve = credit check, /assure = delivery verification)
- Marketplace connects agents who need work done with agents who can do it, using trust scores as the underwriting mechanism
- Could use ERC-8004 attestations as proof of completed work
- Could introduce staking/escrow for higher-value tasks
