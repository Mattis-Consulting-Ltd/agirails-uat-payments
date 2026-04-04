import type { ProofManifest } from "../harness/types.js";

/**
 * AGIRAILS SDK integration layer.
 *
 * Wraps @agirails/sdk to provide:
 *   1. Keccak256 hashing for AIP-4 resultHash (via ProofGenerator)
 *   2. DeliveryProof building with IPFS + EAS attestation
 *   3. Escrow release on UAT pass
 *
 * The SDK handles wallet creation, gas sponsorship, nonce management,
 * and the full escrow lifecycle. No custom Solidity needed.
 */

// Re-export SDK types used by consumers
export type {
  DeliveryProof,
  EscrowReleaseResult,
  ACTPClientConfig,
} from "./types.js";

export interface SdkConfig {
  mode: "testnet" | "mainnet";
  requireAttestation: boolean;
}

export interface DeliveryProofResult {
  txId: string;
  attestationUID: string;
  resultHash: string;
  resultCID: string;
  deliveredAt: number;
}

export interface EscrowReleaseResult {
  escrowId: string;
  released: boolean;
  txHash?: string;
}

/**
 * Initialize the AGIRAILS SDK client.
 *
 * Usage:
 *   const sdk = await initSdkClient({ mode: 'testnet', requireAttestation: true });
 *
 * On testnet, the SDK auto-mints 10,000 test USDC and creates a smart
 * contract wallet with gas sponsorship (no ETH needed).
 */
export async function initSdkClient(config: SdkConfig) {
  // Dynamic import so the SDK dependency is optional until installed
  const { createACTPClient, ProofGenerator } = await import("@agirails/sdk");

  const client = await createACTPClient({
    mode: config.mode,
    easConfig: {}, // SDK provides defaults for testnet
    requireAttestation: config.requireAttestation,
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
export async function generateResultHash(
  manifest: ProofManifest
): Promise<string> {
  const { ProofGenerator } = await import("@agirails/sdk");
  const proofGen = new ProofGenerator();
  return proofGen.hashContent(JSON.stringify(manifest));
}

/**
 * Build a full AIP-4 DeliveryProof from a pinned manifest.
 *
 * Call this after the manifest has been pinned to IPFS. The SDK handles:
 *   - Keccak256 resultHash generation
 *   - IPFS upload via SDK's built-in IPFSClient (for on-chain proof flow)
 *   - EAS attestation creation
 *   - EIP-712 signature
 *
 * Your Pinata service is still used for the initial off-chain manifest pin.
 * The SDK's IPFSClient handles the on-chain proof flow separately.
 */
export async function buildDeliveryProof(
  client: Awaited<ReturnType<typeof initSdkClient>>["client"],
  proofGen: Awaited<ReturnType<typeof initSdkClient>>["proofGen"],
  params: {
    txId: string;
    provider: string;
    consumer: string;
    manifest: ProofManifest;
    metadata?: {
      executionTime?: number;
      outputFormat?: string;
      outputSize?: number;
      notes?: string;
    };
  }
): Promise<DeliveryProofResult> {
  const resultHash = proofGen.hashContent(JSON.stringify(params.manifest));

  const proof = await client.standard.buildDeliveryProof({
    txId: params.txId,
    provider: params.provider,
    consumer: params.consumer,
    resultData: params.manifest,
    resultHash,
    metadata: params.metadata,
  });

  return {
    txId: params.txId,
    attestationUID: proof.attestationUID,
    resultHash,
    resultCID: proof.resultCID,
    deliveredAt: proof.deliveredAt,
  };
}

/**
 * Release escrow after UAT pass and delivery proof submission.
 *
 * The SDK automatically verifies the EAS attestation when
 * requireAttestation is true in the client config. There is no
 * separate "WithVerification" method in SDK 3.0.0.
 */
export async function releaseEscrow(
  client: Awaited<ReturnType<typeof initSdkClient>>["client"],
  escrowId: string,
  txId: string,
  attestationUID: string
): Promise<EscrowReleaseResult> {
  const result = await client.standard.releaseEscrow(escrowId, {
    txId,
    attestationUID,
  });

  return {
    escrowId,
    released: true,
    txHash: result.txHash,
  };
}
