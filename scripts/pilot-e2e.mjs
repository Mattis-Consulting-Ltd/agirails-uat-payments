/**
 * End-to-end pilot: full escrow lifecycle in mock mode.
 *
 * Tests the complete flow:
 *   1. Create ACTP client (mock, no blockchain)
 *   2. Generate a UAT proof manifest
 *   3. Compute SHA-256 manifest hash (internal integrity)
 *   4. Compute Keccak256 result hash (AIP-4 layer)
 *   5. Run full escrow lifecycle: create -> link -> in_progress -> delivered -> released
 *
 * Run: node scripts/pilot-e2e.mjs
 */

import { ACTPClient, ProofGenerator, parseUSDC } from "@agirails/sdk";
import { createHash } from "node:crypto";

const REQUESTER = "0x1111111111111111111111111111111111111111";
const PROVIDER = "0x2222222222222222222222222222222222222222";
const MINT_AMOUNT = "10000"; // $10,000 USDC

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function computeManifestHash(manifest) {
  const filtered = Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestHash")
  );
  const canonical = JSON.stringify(filtered, Object.keys(filtered).sort());
  return sha256(canonical);
}

async function main() {
  console.log("=== AGIRAILS UAT Payments: E2E Pilot (Mock Mode) ===\n");

  // Step 1: Create client in mock mode
  console.log("1. Creating ACTP client (mock mode)...");
  const client = await ACTPClient.create({
    mode: "mock",
    requesterAddress: REQUESTER,
  });
  // Mint test USDC for requester
  await client.mintTokens(REQUESTER, parseUSDC(MINT_AMOUNT));
  const balance = await client.getBalance(REQUESTER);
  console.log(`   Client created OK. Balance: $${Number(balance) / 1e6} USDC\n`);

  // Step 2: Build a test proof manifest
  console.log("2. Building test proof manifest...");
  const manifest = {
    version: "1.0.0",
    taskId: "pilot-task-001",
    projectId: "agirails-uat-payments",
    agentId: "test-agent",
    timestamp: new Date().toISOString(),
    artifacts: [
      {
        name: "test-output.json",
        sha256: sha256('{"result": "success"}'),
        size: 22,
        mimeType: "application/json",
      },
    ],
    testResults: {
      total: 3,
      passed: 3,
      failed: 0,
      outcome: "pass",
      cases: [
        { name: "api-responds", status: "pass", duration: 120 },
        { name: "data-valid", status: "pass", duration: 85 },
        { name: "no-errors", status: "pass", duration: 45 },
      ],
    },
    logs: [
      { timestamp: new Date().toISOString(), level: "info", message: "UAT harness started" },
      { timestamp: new Date().toISOString(), level: "info", message: "All 3 tests passed" },
    ],
    notes: "E2E pilot run in mock mode",
  };

  // Add SHA-256 manifest hash (internal integrity)
  manifest.manifestHash = computeManifestHash(manifest);
  console.log("   Manifest hash (SHA-256):", manifest.manifestHash);
  console.log("   UAT outcome:", manifest.testResults.outcome, "\n");

  // Step 3: Generate Keccak256 result hash (AIP-4 layer)
  console.log("3. Generating Keccak256 result hash (AIP-4)...");
  const proofGen = new ProofGenerator();
  const resultHash = proofGen.hashContent(JSON.stringify(manifest));
  console.log("   Result hash (Keccak256):", resultHash, "\n");

  // Step 4: Run escrow lifecycle
  console.log("4. Running escrow lifecycle...");

  console.log("   4a. Creating transaction ($100 USDC, 24h deadline)...");
  const txId = await client.standard.createTransaction({
    provider: PROVIDER,
    amount: "100.00",
    deadline: "+24h",
  });
  console.log("   Transaction ID:", txId);

  console.log("   4b. Linking escrow (locking funds)...");
  const escrowId = await client.standard.linkEscrow(txId);
  console.log("   Escrow linked:", escrowId);

  console.log("   4c. Transitioning to IN_PROGRESS...");
  await client.standard.transitionState(txId, "IN_PROGRESS");

  let tx = await client.standard.getTransaction(txId);
  console.log("   State:", tx?.state);

  console.log("   4d. Transitioning to DELIVERED...");
  await client.standard.transitionState(txId, "DELIVERED");

  tx = await client.standard.getTransaction(txId);
  console.log("   State:", tx?.state);

  console.log("   4e. Advancing mock time past dispute window...");
  // Default dispute window is 48h (172800s). Advance past it.
  client.advanced.time?.advanceTime(172801);

  console.log("   4f. Releasing escrow...");
  await client.standard.releaseEscrow(escrowId);

  tx = await client.standard.getTransaction(txId);
  console.log("   State:", tx?.state);

  console.log("\n=== PILOT COMPLETE ===");
  console.log("Flow: INITIATED -> COMMITTED -> IN_PROGRESS -> DELIVERED -> SETTLED");
  console.log("Manifest hash (SHA-256):", manifest.manifestHash);
  console.log("Result hash (Keccak256):", resultHash);
  console.log("Transaction ID:", txId);
  console.log("Escrow released: YES");
  console.log("\nNext step: Set ACTP_PRIVATE_KEY and run with mode: 'testnet' for Base Sepolia");
}

main().catch((err) => {
  console.error("PILOT FAILED:", err.message);
  process.exit(1);
});
