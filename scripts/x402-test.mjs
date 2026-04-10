/**
 * x402 Adapter Test
 *
 * Tests the AGIRAILS SDK's X402Adapter against the public x402.org demo
 * endpoint. This is the dual-rail proof: ACTP for escrow, x402 for atomic
 * micropayments, both in the same SDK.
 *
 * Endpoint: https://www.x402.org/protected
 * Cost: $0.01 USDC on Base Sepolia
 *
 * Run: ACTP_KEY_PASSWORD=agirails-pilot-2026 node scripts/x402-test.mjs
 */

import { ACTPClient, X402Adapter } from "@agirails/sdk";
import { ethers } from "ethers";

const ENDPOINT = "https://www.x402.org/protected";
const REQUESTER = "0x4332296366941301C6d86E0e9b96c5F341E872CB"; // Mattis Smart Wallet
const FEE_COLLECTOR = "0x4332296366941301C6d86E0e9b96c5F341E872CB"; // self for testing

// Base Sepolia USDC contract
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const USDC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

async function main() {
  console.log("=== x402 Adapter Test ===\n");
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Requester: ${REQUESTER}`);
  console.log(`Network: Base Sepolia\n`);

  // Step 1: Create the ACTP client (needed to get the wallet provider)
  console.log("1. Initializing ACTP client...");
  const client = await ACTPClient.create({
    mode: "testnet",
    requesterAddress: REQUESTER,
  });
  console.log("   Client ready\n");

  // Step 2: Try the simple route - call client.routeUrlPayment with the URL
  console.log("2. Attempting to route payment via routeUrlPayment...");
  try {
    const result = await client.routeUrlPayment({
      to: ENDPOINT,
      amount: "0.01",
    });
    console.log("   Success!");
    console.log("   Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.log("   Failed:", err.message);
    console.log("   This is expected - X402Adapter needs manual registration");
    console.log("   with a transferFn since the SDK doesn't auto-wire it.\n");
  }

  // Step 3: Manual X402Adapter registration with USDC transfer function
  console.log("3. Registering X402Adapter manually with USDC transfer fn...");

  // Get the wallet provider from the ACTP client
  const walletProvider = client.getWalletProvider();
  console.log("   Wallet provider obtained");

  // The smart wallet abstraction means transactions go through user operations,
  // not direct EOA signing. We build the transferFn using sendTransaction
  // with the USDC contract calldata.

  // Check what methods the wallet provider exposes
  const walletMethods = Object.getOwnPropertyNames(
    Object.getPrototypeOf(walletProvider)
  ).filter((m) => m !== "constructor");
  console.log(`   Wallet methods: ${walletMethods.join(", ")}\n`);

  // Build a transferFn using sendTransaction + USDC.transfer calldata
  console.log("4. Building transferFn via sendTransaction + USDC ABI...");
  const usdcInterface = new ethers.Interface(USDC_ABI);

  const transferFn = async (to, amount) => {
    console.log(`   USDC transfer: ${amount} wei -> ${to}`);
    const data = usdcInterface.encodeFunctionData("transfer", [to, amount]);
    const result = await walletProvider.sendTransaction({
      to: USDC_ADDRESS,
      data,
      value: 0n,
    });
    const hash = typeof result === "string" ? result : (result.hash || result.transactionHash);
    console.log(`   Tx hash: ${hash}`);
    return hash;
  };

  console.log("5. Registering X402Adapter...");
  const adapter = new X402Adapter(REQUESTER, {
    expectedNetwork: "base-sepolia",
    transferFn,
    feeCollector: FEE_COLLECTOR,
  });
  console.log("   X402Adapter registered\n");

  console.log("6. Calling protected x402 endpoint...");
  const result = await adapter.pay({
    to: ENDPOINT,
    amount: "0.01",
  });

  console.log("\n=== x402 PAYMENT COMPLETE ===");
  console.log(`HTTP status: ${result.response?.status || "N/A"}`);
  console.log(`Tx hash: ${result.txHash || "N/A"}`);
  console.log(`Settlement: ${result.releaseRequired ? "escrow" : "atomic"}`);
  if (result.response?.body) {
    console.log(`Body: ${JSON.stringify(result.response.body).substring(0, 200)}`);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
