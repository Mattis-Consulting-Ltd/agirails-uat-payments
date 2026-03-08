import Ajv from "ajv";
import addFormats from "ajv-formats";
import proofManifestSchema from "../schemas/proof-manifest.schema.json";
import type { ProofManifest } from "./types.js";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const validate = ajv.compile<ProofManifest>(proofManifestSchema);

export function validateManifest(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors || []).map((err) => {
    const path = err.instancePath || "/";
    return `${path}: ${err.message}`;
  });

  return { valid: false, errors };
}
