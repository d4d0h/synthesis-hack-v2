# Agent Credit PRD

## Product

**Working name:** TrustVault Credit

**One-line pitch:** short-term programmable working capital for autonomous agents, underwritten from onchain identity, delivery history, and expected job revenue.

**Short version:** agents in marketplaces need money before they get paid. They need funds for inference, browser sessions, API calls, gas, and subcontractors. TrustVault Credit approves small revenue-backed advances and repays them automatically from verified task payouts.

## Why This Matters

Agent marketplaces are likely to create a new class of workers:

- agents that take jobs
- agents that subcontract work
- agents that buy tools to complete jobs
- agents that only get paid after delivery

That creates a working-capital problem. Human freelancers use credit cards, invoice factoring, and merchant cash advances. Agents have none of that.

This product is not generic unsecured lending. It is marketplace-native underwriting for agent labor.

## Problem

An agent wins a task worth `$100`, but needs `$12` now for:

- LLM calls
- browser automation credits
- paid APIs
- gas fees
- specialist sub-agent fees

Without upfront capital, the agent cannot execute the task that would have repaid the cost.

Current infrastructure solves adjacent problems:

- identity
- payments
- trust/reputation
- permissions

It does not solve **agent working capital**.

## Product Thesis

If an agent has:

- a verifiable identity
- a history of successful completions
- a known marketplace payout or receivable
- a bounded task duration

then it should be possible to extend **small, short-term, programmable credit** with automatic repayment and rapid default updates.

## Users

### Primary

- autonomous agents operating in job marketplaces
- lead agents coordinating specialist sub-agents
- agent-run businesses with recurring task revenue

### Secondary

- marketplaces that want more task completion volume
- capital providers underwriting agent work
- infra providers selling compute or tool access to agents

## Core Use Cases

1. **Revenue advance**
   Agent wins a paid task and requests a small advance to cover execution costs.

2. **Tool credit**
   Agent gets a spend-limited credit line usable only with approved tool vendors.

3. **Sub-agent payroll**
   Lead agent hires a specialist before receiving the client payout.

4. **Invoice factoring**
   Marketplace confirms an expected payout and TrustVault advances part of it immediately.

## MVP Scope

### What the MVP does

- computes an agent credit profile
- quotes a maximum advance and fee
- approves or declines a funding request
- simulates disbursement
- records repayment from task payout
- records defaults and reduces future limits

### What the MVP does not do

- open capital pools
- real liquidation
- generalized unsecured long-duration loans
- sophisticated DeFi integration across many protocols
- permissionless lender marketplace

## Product Principles

1. **Revenue-backed first**
   Prefer advances tied to expected payout, not open-ended debt.

2. **Short duration only**
   Credit should default to hours or days, not weeks.

3. **Programmable use constraints**
   Funds can be restricted to approved categories or vendors.

4. **Fast credit deterioration**
   Defaults should immediately affect limits.

5. **Task-specific underwriting**
   Underwriting should care about what the agent is trying to do, not only who it is.

## Key Concepts

### Credit Profile

Persistent profile per agent containing:

- identity status
- trust metrics
- successful jobs
- failed jobs
- repayment history
- total financed volume
- recent default indicators
- current utilization

### Job Receivable

A claim on an expected payment from a marketplace or client workflow.

Fields:

- job id
- payer
- expected amount
- due time
- completion status
- proof of completion

### Credit Advance

A short-term funding decision tied to a specific task or receivable.

Fields:

- approved amount
- fee
- duration
- spend restrictions
- repayment source
- current status

## Underwriting Model

The first version should be simple and legible.

### Inputs

- ERC-8004 registration status
- trust score
- attestation count and diversity
- successful cooperation count
- prior defaults
- prior repaid advances
- expected job payout amount
- requested advance / payout ratio
- task duration

### Derived Metrics

- completion rate
- repayment rate
- average task value
- utilization ratio
- recency-weighted reliability
- maximum historical loss

### Initial Decision Output

- `APPROVED`
- `MANUAL_REVIEW`
- `DECLINED`

### Initial Credit Formula

This should stay heuristic for MVP:

`base_limit = trust_component + completion_component + repayment_component`

Then apply:

- default penalty
- utilization penalty
- duration penalty
- payout coverage cap

Final limit:

`maxAdvance = min(base_limit, payoutAmount * 0.3, hardCap)`

Suggested starting hard cap for demo:

- `$25` to `$100`

## Core API

### `POST /credit/profile`

Returns an underwritten agent credit profile.

Request:

```json
{
  "agentAddress": "0x...",
  "agentUrl": "https://agent.example"
}
```

Response:

```json
{
  "creditScore": 72,
  "creditLimit": 45,
  "repaymentRate": 1,
  "completionRate": 0.89,
  "successfulJobs": 8,
  "defaults": 0,
  "reasons": [
    "ERC-8004 registered",
    "8 successful jobs",
    "No prior defaults"
  ]
}
```

### `POST /credit/quote`

Generates a quote for a specific job.

Request:

```json
{
  "agentAddress": "0x...",
  "jobId": "job_123",
  "expectedPayout": 100,
  "requestedAmount": 15,
  "durationHours": 12,
  "purpose": "compute"
}
```

Response:

```json
{
  "decision": "APPROVED",
  "approvedAmount": 15,
  "fee": 1.2,
  "maxDurationHours": 12,
  "repaymentSource": "job_payout",
  "constraints": [
    "Use restricted to approved vendors",
    "Repayment sweeps from payout first"
  ],
  "confidence": 0.81
}
```

### `POST /credit/advance`

Creates the advance.

### `POST /credit/repay`

Repays from the completed job payout.

### `POST /credit/default`

Marks a failed repayment or failed delivery event.

## Marketplace Integration

The product is strongest if framed as infrastructure for job platforms.

### Marketplace responsibilities

- create jobs
- record expected payout
- confirm completion
- send payout to repayment hook first

### TrustVault responsibilities

- underwrite
- issue quote
- track active advances
- collect repayment
- update credit profile

## Demo Flow

1. Agent registers identity.
2. Agent has past trust/cooperation history.
3. Marketplace posts a task worth `$100`.
4. Agent requests a `$15` advance for compute.
5. TrustVault approves with a fee and restrictions.
6. Agent completes the task.
7. Marketplace sends payout.
8. TrustVault sweeps repayment and updates the profile.
9. Agent's credit limit increases on the next request.

## Why This Fits Synthesis

### Agents that pay

This is directly about agent-native credit and working capital.

### Agents that trust

Credit underwriting depends on verifiable reputation and delivery history.

### Agents that cooperate

Lead agents can finance specialist sub-agents and coordinate delivery chains.

## Why This Likely Fits Aave Direction

Conceptually this is a strong fit with Aave's lending DNA because it sits near:

- credit delegation
- undercollateralized lending
- working capital
- stablecoin-based short-term financing

The best sponsor-facing framing is:

**"Revenue-backed credit rails for autonomous workers."**

If you integrate an Aave/GHO flow later, the clean path is:

- warehouse capital comes from a lending pool
- advances are denominated in GHO or stablecoins
- repayment settles back into the pool

## Risks

1. **Fake revenue**
   A malicious marketplace or client could invent a payout.

2. **Sybil job history**
   Agent could collude to fabricate successful tasks.

3. **No hard recovery**
   If repayment fails, early versions mostly rely on future access denial and reputation damage.

4. **Over-complexity**
   If you add full DeFi plumbing too early, the demo will get muddy.

## Risk Mitigations For MVP

- only finance marketplace-confirmed jobs
- keep durations short
- cap advances to a low percentage of payout
- start with tiny hard caps
- heavily penalize defaults
- require verified identity for borrowing

## MVP Architecture

### Services

- **Credit Engine**
  Underwriting, limits, quotes, approvals

- **Agent Profile Store**
  Trust history, repayment history, job outcomes

- **Marketplace Simulator**
  Job creation, completion, payout

- **Optional Onchain Module**
  ERC-8004 lookup and future payout settlement hooks

## Build Plan

### Phase 1

- rename the thesis
- add credit types
- add profile + quote + advance + repay routes
- simulate marketplace job lifecycle

### Phase 2

- add task-specific underwriting
- add vendor restrictions
- add default handling

### Phase 3

- add sponsor-facing integration story
- optionally add GHO/Aave-backed capital source

## Success Criteria

The MVP is successful if a judge can see:

1. why agents need working capital
2. why generic trust scores are not enough
3. how financing is approved from verifiable history
4. how repayment is tied to completed work
5. how defaults reduce future access to capital

## Positioning

Do not pitch this as:

- "DeFi for AI agents"
- "unsecured lending protocol"
- "credit score for bots"

Pitch it as:

**the underwriting layer for agent marketplaces**

or

**working capital for autonomous workers**

## Next Decision

Choose one of these product cuts before building:

1. **Revenue Advance**
   Best balance of novelty and feasibility.

2. **Tool Credit**
   Easiest to constrain and demo.

3. **Sub-agent Payroll**
   Best multi-agent story, but more moving pieces.

Recommendation: start with **Revenue Advance**.
