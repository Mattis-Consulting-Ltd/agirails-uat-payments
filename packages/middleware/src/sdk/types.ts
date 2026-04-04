/**
 * Type definitions for @agirails/sdk integration.
 *
 * These mirror the SDK's published types so the rest of the middleware
 * can reference them without importing the SDK directly.
 * Update when the SDK publishes breaking type changes.
 */

export interface DeliveryProof {
  type: "agirails.delivery.v1";
  version: "1.0.0";
  txId: string;
  provider: string;
  consumer: string;
  resultCID: string;
  resultHash: string;
  easAttestationUID: string;
  deliveredAt: number;
  metadata?: {
    executionTime?: number;
    outputFormat?: string;
    outputSize?: number;
    notes?: string;
  };
  nonce: number;
  signature: string;
  chainId: number;
}

export interface EscrowReleaseResult {
  escrowId: string;
  released: boolean;
  txHash?: string;
}

export interface ACTPClientConfig {
  mode: "testnet" | "mainnet";
  easConfig?: Record<string, unknown>;
  requireAttestation?: boolean;
}
