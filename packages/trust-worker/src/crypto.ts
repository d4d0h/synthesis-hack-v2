/**
 * Lightweight crypto utilities for EVM address derivation.
 * Uses a deterministic hash for demo — real derivation via viem in scripts package.
 */

/** Derive a deterministic demo address from a hex private key */
export function computeAddress(privateKey: string): string {
  const key = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  const hash = deterministicHash(key);
  return `0x${hash.slice(0, 40)}`;
}

/** Deterministic hash for demo address derivation */
function deterministicHash(input: string): string {
  let hash = 0n;
  for (let i = 0; i < input.length; i++) {
    const char = BigInt(input.charCodeAt(i));
    hash = ((hash << 5n) - hash + char) & ((1n << 256n) - 1n);
  }
  return hash.toString(16).padStart(64, "0");
}
