# TrustVault v2

**Verifiable Trust Resume Agent for the Agent Economy**

Synthesis Hackathon | Track: Agents that Trust + Agents that Cooperate

---

## What is TrustVault?

An autonomous agent that builds and maintains **portable, verifiable trust profiles** using [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) onchain identity. Agents can:

- Register onchain identity (ERC-8004 Identity Registry)
- Issue and receive verifiable attestations
- Compute trust scores from attestation history
- Make AI-enhanced cooperation decisions based on peer reputation
- Expose a queryable trust resume for agent-to-agent discovery

No central authority needed. Trust is portable, verifiable, and onchain.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge)                │
│                                                      │
│  ┌─────────────────┐     ┌──────────────────┐       │
│  │  trust-worker    │     │  peer-agent       │       │
│  │  (Hono + DO)     │◄───►│  (Hono)           │       │
│  │                  │     │                   │       │
│  │  - Agent Card    │     │  - Demo partner   │       │
│  │  - Trust Resume  │     │  - Attest exchange│       │
│  │  - Attestations  │     │  - Cooperation    │       │
│  │  - Cooperation   │     └──────────────────┘       │
│  │  - ERC-8004      │                                │
│  │  - AI Chat       │                                │
│  └────────┬─────────┘                                │
│           │ Durable Object (persistent state)        │
└───────────┼──────────────────────────────────────────┘
            │
    ┌───────▼────────┐     ┌──────────────────┐
    │  ERC-8004       │     │  AI Providers     │
    │  Contracts      │     │                   │
    │  (Sepolia)      │     │  Claude (reason)  │
    │                 │     │  Venice (budget)   │
    │  - Identity Reg │     │  OpenRouter (fb)   │
    │  - Reputation   │     └──────────────────┘
    └─────────────────┘
```

### Key Innovation: Durable Object Agent

Unlike stateless Workers, TrustVault uses a **Cloudflare Durable Object** as its persistent brain:
- Agent memory survives across requests (attestation history, cooperation records)
- No external database needed
- Globally consistent state with strong consistency guarantees
- Sub-millisecond reads from storage

## Packages

| Package | Description |
|---------|-------------|
| `packages/trust-worker` | Main agent — CF Worker + Durable Object with Hono routing |
| `packages/peer-agent` | Demo cooperation partner — second CF Worker |
| `packages/scripts` | Setup utilities — wallet generation, ERC-8004 registration, demo runner |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Generate wallets
npm run setup

# 3. Configure API keys
cp .env.example .env
# Edit .env with your keys

# 4. Start the agent (dev mode)
npm run dev

# 5. In another terminal, start the peer agent
npm run dev:peer

# 6. Run the cooperation demo
npm run demo
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/.well-known/agent.json` | GET | Agent card (ERC-8004 / A2A discovery) |
| `/health` | GET | Health check |
| `/trust/resume` | GET | Get this agent's trust resume |
| `/trust/resume/:address` | GET | Query trust data for any address |
| `/trust/attest` | POST | Issue an attestation |
| `/trust/attestations` | GET | Get all attestations (given & received) |
| `/trust/cooperate` | POST | Evaluate cooperation with a peer |
| `/trust/cooperate/accept` | POST | Handle incoming cooperation request |
| `/erc8004/identity` | GET | Check onchain registration |
| `/erc8004/register` | POST | Register identity onchain |
| `/erc8004/reputation/:address` | GET | Read onchain reputation |
| `/erc8004/reputation` | POST | Write reputation onchain |
| `/chat` | POST | AI chat about trust profile |

## Trust Scoring Algorithm

```
trust_score = avg_attestation_score
            + volume_bonus (min(15, count * 2))
            + diversity_bonus (min(10, categories * 3))
            + onchain_bonus (5 if registered)
```

Capped at 100. Cooperation thresholds:
- **>= 70**: Accept cooperation
- **40-69**: Negotiate (request additional verification)
- **< 40**: Decline

## Synthesis Registration

```bash
# Register with the hackathon
HUMAN_NAME="Your Name" HUMAN_EMAIL="you@example.com" npm run register-synthesis
```

See `docs/skill.md` for the full Synthesis API reference.

## Tech Stack

- **Runtime**: Cloudflare Workers + Durable Objects
- **Framework**: Hono (lightweight, edge-native)
- **Onchain**: ERC-8004 (Sepolia testnet) via viem
- **AI**: Claude (reasoning), Venice AI (budget/privacy), OpenRouter/MiniMax (fallback)
- **Language**: TypeScript

## License

MIT
