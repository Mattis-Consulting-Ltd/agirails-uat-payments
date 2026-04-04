import { ACTPClient, ProofGenerator, parseUSDC } from "@agirails/sdk";
import type { ProofManifest } from "../harness/types.js";

/**
 * AGIRAILS SDK integration layer.
 *
 * Wraps @agirails/sdk to provide:
 *   1. Keccak256 hashing for AIP-4 resultHash (via ProofGenerator)
 *   2. Full escrow lifecycle (create, link, deliver, release)
 *
 * The SDK handles wallet creation, gas sponsorship, nonce management,
 * and the full escrow lifecycle. No custom Solidity needed.
 *
 * API tier: client.standard (production apps needing lifecycle control).
 * releaseEscrow takes the escrowId (from linkEscrow), not the txId.
 * Dispute window must elapse before release (mock: use time.advanceTime).
 */

export { parseUSDC };

export interface SdkConfig {
  /** 'mock' for local testing, 'testnet' for Base Sepolia, 'mainnet' for Base */
  mode: "mock" | "testnet" | "mainnet";
  /** Address of the requester (escrow creator / UAT verifier) */
  requesterAddress: string;
  /** Optional custom RPC URL */
  rpcUrl?: string;
}

export interface DeliveryProofResult {
  txId: string;
  escrowId: string;
  resultHash: string;
  state: string;
}

export interface EscrowReleaseResult {
  txId: string;
  escrowId: string;
  released: boolean;
}

/**
 * Initialize the AGIRAILS SDK client.
 *
 * Uses ACTPClient.create() async factory. In mock mode, no blockchain
 * connection is needed. In testnet mode, the SDK auto-detects
 * .actp/keystore.json or ACTP_PRIVATE_KEY env var.
 *
 * On testnet, the SDK auto-mints 10,000 test USDC and creates a smart
 * contract wallet with gas sponsorship (no ETH needed).
 */
export async function initSdkClient(config: SdkConfig) {
  const client = await ACTPClient.create({
    mode: config.mode,
    requesterAddress: config.requesterAddress,
    ...(config.rpcUrl ? { rpcUrl: config.rpcUrl } : {}),
  });

  const proofGen = new ProofGenerator();

  return { client, proofGen };
}

/**
 * Generate a Keccak256 resultHash from a proof manifest.
 *
 * The manifest's internal integrity uses SHA-256 (manifestHash field).
 * The AIP-4 layer uses Keccak256 for the resultHash. Both hashes coexist:
 *   - SHA-256 manifestHash: verifies manifest content integrity
 *   - Keccak256 resultHash: used in the on-chain DeliveryProof
 */
export function generateResultHash(manifest: ProofManifest): string {
  const proofGen = new ProofGenerator();
  return proofGen.hashContent(JSON.stringify(manifest));
}

/**
 * Run the full escrow lifecycle:
 *   1. Create transaction
 *   2. Link escrow (lock funds)
 *   3. Transition to IN_PROGRESS
 *   4. Transition to DELIVERED
 *   5. Release escrow (after dispute window)
 *
 * Uses client.standard API tier for explicit lifecycle control.
 * Note: releaseEscrow takes the escrowId (returned by linkEscrow),
 * NOT the txId. The dispute window must elapse before release.
 */
export async function runEscrowLifecycle(
  client: ACTPClient,
  proofGen: ProofGenerator,
  params: {
    provider: string;
    amount: string;
    deadline: string;
    manifest: ProofManifest;
  }
): Promise<EscrowReleaseResult> {
  const txId = await client.standard.createTransaction({
    provider: params.provider,
    amount: params.amount,
    deadline: params.deadline,
  });

  const escrowId = await client.standard.linkEscrow(txId);

  await client.standard.transitionState(txId, "IN_PROGRESS");

  const _resultHash = proofGen.hashContent(JSON.stringify(params.manifest));

  await client.standard.transitionState(txId, "DELIVERED");

  // In mock mode, dispute window must be advanced via time.advanceTime().
  // On testnet/mainnet, the dispute window elapses in real time.
  await client.standard.releaseEscrow(escrowId);

  return {
    txId,
    escrowId,
    released: true,
  };
}

/**
 * Submit a delivery proof and release escrow for an existing transaction.
 *
 * Call this when a UAT harness pass triggers payment release on a
 * transaction that was already created and committed externally.
 */
export async function deliverAndRelease(
  client: ACTPClient,
  proofGen: ProofGenerator,
  params: {
    txId: string;
    escrowId: string;
    manifest: ProofManifest;
  }
): Promise<DeliveryProofResult> {
  const resultHash = proofGen.hashContent(JSON.stringify(params.manifest));

  await client.standard.transitionState(params.txId, "DELIVERED");

  await client.standard.releaseEscrow(params.escrowId);

  const tx = await client.standard.getTransaction(params.txId);

  return {
    txId: params.txId,
    escrowId: params.escrowId,
    resultHash,
    state: tx?.state ?? "SETTLED",
  };
}
