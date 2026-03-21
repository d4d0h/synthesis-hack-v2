/**
 * Register Agent Identity on ERC-8004 Identity Registry
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const IDENTITY_REGISTRY_ABI = parseAbi([
  "function registerAgent(string name, string description, string metadataURI) external returns (uint256 tokenId)",
  "function getAgent(address agent) external view returns (string name, string description, bool registered)",
  "event AgentRegistered(address indexed agent, uint256 indexed tokenId, string name)",
]);

async function main() {
  const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
  const registryAddress = process.env.IDENTITY_REGISTRY as `0x${string}`;
  const rpcUrl = process.env.CHAIN_RPC_URL;

  if (!privateKey || !registryAddress || !rpcUrl) {
    console.error("Missing required env vars: AGENT_PRIVATE_KEY, IDENTITY_REGISTRY, CHAIN_RPC_URL");
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey);
  console.log(`Agent address: ${account.address}`);

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  // Check if already registered
  try {
    const [name, , registered] = await publicClient.readContract({
      address: registryAddress,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "getAgent",
      args: [account.address],
    });
    if (registered) {
      console.log(`Already registered as "${name}"`);
      return;
    }
  } catch {
    console.log("Registry check failed — proceeding with registration...");
  }

  // Register
  console.log("Registering agent identity...");
  const hash = await walletClient.writeContract({
    address: registryAddress,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: "registerAgent",
    args: [
      "TrustVault",
      "Autonomous trust resume agent for the agent economy. Builds verifiable reputation using ERC-8004 attestations.",
      "https://trustvault-agent.workers.dev/.well-known/agent.json",
    ],
  });

  console.log(`Transaction sent: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas used: ${receipt.gasUsed}`);
  console.log(`Status: ${receipt.status}`);

  console.log("\nAgent registered on ERC-8004 Identity Registry!");
  console.log(`Explorer: https://sepolia.etherscan.io/tx/${hash}`);
}

main().catch(console.error);
