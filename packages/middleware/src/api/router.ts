import { Router } from "express";
import { apiKeyAuth } from "./auth.js";
import { createSubmitProofHandler } from "./submit-proof.js";
import type { SubmitProofDeps } from "./submit-proof.js";
import { createProofStatusHandler } from "./proof-status.js";
import type { ProofStore } from "./proof-status.js";
import { proofSubmissionLimiter } from "./rate-limit.js";

export interface ApiRouterDeps extends SubmitProofDeps {
  proofStore: ProofStore;
}

export function createApiRouter(deps: ApiRouterDeps): Router {
  const router = Router();

  router.use(apiKeyAuth);

  router.post("/submit-proof", proofSubmissionLimiter, createSubmitProofHandler(deps));
  router.get("/proofs/:taskId/status", createProofStatusHandler(deps.proofStore));

  return router;
}
