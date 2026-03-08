import type { Request, Response, NextFunction } from "express";
import { validateManifest } from "../harness/validator.js";
import { computeManifestHash } from "../harness/hash.js";
import type { IpfsService } from "../ipfs/service.js";
import { ValidationError, IpfsPinError } from "../errors.js";

export interface SubmitProofDeps {
  ipfsService: IpfsService;
  onProofPinned?: (taskId: string, cid: string) => void;
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

      const pinResult = await deps.ipfsService.pinManifest(manifest);

      if (deps.onProofPinned) {
        deps.onProofPinned(manifest.taskId, pinResult.cid);
      }

      res.status(201).json({
        status: "pinned",
        taskId: manifest.taskId,
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
