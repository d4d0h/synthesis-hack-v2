/**
 * Lightweight crypto utilities for EVM address derivation and signing.
 * Uses Web Crypto API (available in Workers) + viem for address computation.
 */

/**
 * Derive an Ethereum address from a hex private key.
 * Uses a simplified approach — in production, use viem's privateKeyToAccount.
 */
export function computeAddress(privateKey: string): string {
  // Normalize: strip 0x prefix if present
  const key = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;

  // For the Worker environment, we derive address via keccak of the public key.
  // This is a placeholder — the actual derivation happens in the scripts package
  // using viem, and the address is stored in the Durable Object state.
  // At runtime, we use the stored address from registration.
  //
  // For demo purposes, derive a deterministic address from the key:
  const hash = simpleHash(key);
  return `0x${hash.slice(0, 40)}`;
}

/** Simple deterministic hash for demo address derivation */
function simpleHash(input: string): string {
  let hash = 0n;
  for (let i = 0; i < input.length; i++) {
    const char = BigInt(input.charCodeAt(i));
    hash = ((hash << 5n) - hash + char) & ((1n << 256n) - 1n);
  }
  return hash.toString(16).padStart(64, "0");
}

/**
 * Sign a message with the agent's private key.
 * In production, use viem's signMessage.
 */
export function signMessage(_privateKey: string, _message: string): string {
  // Placeholder — real signing uses viem in the scripts package
  return "0x_signature_placeholder";
}
