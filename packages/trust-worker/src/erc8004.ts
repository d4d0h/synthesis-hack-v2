/**
 * ERC-8004 Onchain Routes
 *
 * Handles onchain identity registration and reputation read/write
 * via JSON-RPC calls to the configured chain.
 *
 * NOTE: Function selectors and ABI encoding are simplified for demo.
 * Production usage should use viem's encodeFunctionData.
 */
import { Hono } from "hono";
import type { Env } from "./types";
import { computeAddress } from "./crypto";

// Demo function selectors — replace with real keccak selectors for production
const SELECTORS = {
  registerAgent: "0x1a2b3c4d",
  getAgent: "0x5e6f7a8b",
  addReputation: "0x9c0d1e2f",
  getReputation: "0x3a4b5c6d",
} as const;

export function erc8004Routes() {
  const router = new Hono<{ Bindings: Env }>();

  router.get("/identity", async (c) => {
    try {
      const agentAddress = computeAddress(c.env.AGENT_PRIVATE_KEY);
      const result = await jsonRpc(c.env.CHAIN_RPC_URL, "eth_call", [
        { to: c.env.IDENTITY_REGISTRY, data: SELECTORS.getAgent + agentAddress.slice(2).padStart(64, "0") },
        "latest",
      ]);
      return c.json({ registered: result !== "0x", raw: result });
    } catch (e: unknown) {
      return c.json({ registered: false, error: errorMessage(e) });
    }
  });

  router.post("/register", async (c) => {
    const { name, description } = await c.req.json<{ name: string; description: string }>();
    try {
      const txParams = await prepareTx(c.env, {
        to: c.env.IDENTITY_REGISTRY,
        data: SELECTORS.registerAgent + encodeString(name) + encodeString(description),
      });
      return c.json({ ...txParams, status: "prepared" });
    } catch (e: unknown) {
      return c.json({ error: errorMessage(e) }, 500);
    }
  });

  router.get("/reputation/:address", async (c) => {
    const address = c.req.param("address");
    try {
      const result = await jsonRpc(c.env.CHAIN_RPC_URL, "eth_call", [
        { to: c.env.REPUTATION_REGISTRY, data: SELECTORS.getReputation + address.slice(2).padStart(64, "0") },
        "latest",
      ]);
      return c.json({ address, reputation: result });
    } catch (e: unknown) {
      return c.json({ address, error: errorMessage(e) });
    }
  });

  router.post("/reputation", async (c) => {
    const { targetAddress, score, evidence } = await c.req.json<{
      targetAddress: string;
      score: number;
      evidence: string;
    }>();
    try {
      const txParams = await prepareTx(c.env, {
        to: c.env.REPUTATION_REGISTRY,
        data: SELECTORS.addReputation +
          targetAddress.slice(2).padStart(64, "0") +
          score.toString(16).padStart(64, "0") +
          encodeString(evidence),
      });
      return c.json({ ...txParams, status: "prepared" });
    } catch (e: unknown) {
      return c.json({ error: errorMessage(e) }, 500);
    }
  });

  return router;
}

// ─── JSON-RPC helper ───

async function jsonRpc(rpcUrl: string, method: string, params: unknown[]): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result || "0x";
}

/**
 * Prepare transaction params (nonce + gas estimate).
 * Actual signing should be done via viem in the scripts package.
 */
async function prepareTx(
  env: Env,
  params: { to: string; data: string }
): Promise<{ from: string; to: string; data: string; nonce: string; gasEstimate: string }> {
  const fromAddress = computeAddress(env.AGENT_PRIVATE_KEY);

  const [nonce, gasEstimate] = await Promise.all([
    jsonRpc(env.CHAIN_RPC_URL, "eth_getTransactionCount", [fromAddress, "pending"]),
    jsonRpc(env.CHAIN_RPC_URL, "eth_estimateGas", [
      { from: fromAddress, to: params.to, data: params.data },
    ]),
  ]);

  return { from: fromAddress, to: params.to, data: params.data, nonce, gasEstimate };
}

/** Simplified ABI string encoding for demo — use viem's encodeAbiParameters in production */
function encodeString(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const len = bytes.length.toString(16).padStart(64, "0");
  return len + hex.padEnd(Math.ceil(hex.length / 64) * 64, "0");
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
