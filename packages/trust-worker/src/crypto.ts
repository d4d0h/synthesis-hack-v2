/**
 * Lightweight crypto utilities.
 */

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(bytes));
}

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
