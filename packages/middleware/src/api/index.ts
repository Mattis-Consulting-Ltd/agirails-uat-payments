export { createApiRouter } from "./router.js";
export type { ApiRouterDeps } from "./router.js";
export { apiKeyAuth } from "./auth.js";
export { createSubmitProofHandler } from "./submit-proof.js";
export type { SubmitProofDeps } from "./submit-proof.js";
export {
  createProofStatusHandler,
  createInMemoryProofStore,
} from "./proof-status.js";
export type { ProofRecord, ProofStore } from "./proof-status.js";
