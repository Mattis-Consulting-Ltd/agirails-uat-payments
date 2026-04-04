import type { Request, Response, NextFunction } from "express";
import { validateManifest } from "../harness/validator.js";
import { computeManifestHash } from "../harness/hash.js";
import type { IpfsService } from "../ipfs/service.js";
import type { ProofManifest } from "../harness/types.js";
import { ValidationError, IpfsPinError, EscrowError } from "../errors.js";
import {
  initSdkClient,
  buildDeliveryProof,
  releaseEscrow,
  type SdkConfig,
} from "../sdk/index.js";

export interface SubmitProofDeps {
  ipfsService: IpfsService;
  sdkConfig?: SdkConfig;
  onProofPinned?: (taskId: string, cid: string) => void;
  onEscrowReleased?: (taskId: string, escrowId: string, txHash?: string) => void;
}

export function createSubmitProofHandler(deps: SubmitProofDeps) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const manifest = req.body;

      if (!manifest || typeof manifest !== "object") {
        throw new ValidationError("Request body must be a JSON object");
      }

      const validation = validateManifest(manifest);
      if (!validation.valid) {
        res.status(422).json({
          error: "Manifest failed schema validation",
          details: validation.errors,
        });
        return;
      }

      const expectedHash = computeManifestHash(manifest as Record<string, unknown>);
      if (manifest.manifestHash !== expectedHash) {
        res.status(422).json({
          error: "Manifest hash mismatch: content has been tampered with or hash was computed incorrectly",
          expected: expectedHash,
          received: manifest.manifestHash,
        });
        return;
      }

      // Step 1: Pin manifest to IPFS (existing Pinata flow)
      const pinResult = await deps.ipfsService.pinManifest(manifest);

      if (deps.onProofPinned) {
        deps.onProofPinned(manifest.taskId, pinResult.cid);
      }

      // Step 2: If SDK is configured and UAT passed, build delivery proof + release escrow
      const typedManifest = manifest as ProofManifest;
      const uatPassed = typedManifest.testResults?.outcome === "pass";
      const escrowId = req.headers["x-escrow-id"] as string | undefined;
      const txId = req.headers["x-actp-tx-id"] as string | undefined;
      const provider = req.headers["x-provider-did"] as string | undefined;
      const consumer = req.headers["x-consumer-did"] as string | undefined;

      if (deps.sdkConfig && uatPassed && txId && provider && consumer) {
        try {
          const { client, proofGen } = await initSdkClient(deps.sdkConfig);

          // Build AIP-4 delivery proof (Keccak256 hash + EAS attestation)
          const proofResult = await buildDeliveryProof(client, proofGen, {
            txId,
            provider,
            consumer,
            manifest: typedManifest,
            metadata: {
              executionTime: typedManifest.testResults.cases.reduce(
                (sum, c) => sum + c.duration,
                0
              ),
              outputFormat: "application/json",
              notes: typedManifest.notes,
            },
          });

          // Release escrow if escrowId provided
          let escrowResult;
          if (escrowId) {
            escrowResult = await releaseEscrow(
              client,
              escrowId,
              txId,
              proofResult.attestationUID
            );

            if (deps.onEscrowReleased) {
              deps.onEscrowReleased(
                typedManifest.taskId,
                escrowId,
                escrowResult.txHash
              );
            }
          }

          res.status(201).json({
            status: escrowResult ? "released" : "proven",
            taskId: typedManifest.taskId,
            cid: pinResult.cid,
            ipfsUrl: deps.ipfsService.buildGatewayUrl(pinResult.cid),
            size: pinResult.size,
            proof: {
              attestationUID: proofResult.attestationUID,
              resultHash: proofResult.resultHash,
              resultCID: proofResult.resultCID,
              deliveredAt: proofResult.deliveredAt,
            },
            escrow: escrowResult
              ? {
                  escrowId,
                  released: escrowResult.released,
                  txHash: escrowResult.txHash,
                }
              : undefined,
          });
          return;
        } catch (sdkErr) {
          const message = sdkErr instanceof Error ? sdkErr.message : "Unknown SDK error";
          next(new EscrowError(`SDK integration failed: ${message}`));
          return;
        }
      }

      // Fallback: IPFS-only response (no SDK config, UAT failed, or missing headers)
      res.status(201).json({
        status: "pinned",
        taskId: typedManifest.taskId,
        cid: pinResult.cid,
        ipfsUrl: deps.ipfsService.buildGatewayUrl(pinResult.cid),
        size: pinResult.size,
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        next(err);
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      next(new IpfsPinError(`Failed to pin manifest to IPFS: ${message}`));
    }
  };
}
