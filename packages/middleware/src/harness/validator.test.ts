import { validateManifest } from "./validator";
import { computeManifestHash } from "./hash";
import type { ProofManifest } from "./types";

function buildValidManifest(
  overrides: Partial<ProofManifest> = {}
): ProofManifest {
  const base: Omit<ProofManifest, "manifestHash"> = {
    version: "1.0.0",
    taskId: "task-001",
    projectId: "project-001",
    agentId: "agent-001",
    timestamp: new Date().toISOString(),
    artifacts: [
      {
        name: "output.json",
        sha256:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        size: 1024,
        mimeType: "application/json",
      },
    ],
    testResults: {
      total: 2,
      passed: 2,
      failed: 0,
      outcome: "pass",
      cases: [
        { name: "test-1", status: "pass", duration: 150 },
        { name: "test-2", status: "pass", duration: 200 },
      ],
    },
    ...overrides,
  };

  const manifestHash = computeManifestHash(
    base as unknown as Record<string, unknown>
  );
  return { ...base, manifestHash };
}

describe("validateManifest", () => {
  it("accepts a valid manifest", () => {
    const manifest = buildValidManifest();
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a manifest with optional logs and notes", () => {
    const manifest = buildValidManifest({
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Task started",
        },
      ],
      notes: "Ran against staging environment",
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
  });

  it("rejects manifest missing required fields", () => {
    const result = validateManifest({ version: "1.0.0" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects manifest with invalid version", () => {
    const manifest = buildValidManifest();
    (manifest as unknown as Record<string, unknown>).version = "2.0.0";
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("version"))).toBe(true);
  });

  it("rejects manifest with invalid sha256 format", () => {
    const manifest = buildValidManifest({
      artifacts: [
        {
          name: "file.txt",
          sha256: "not-a-hash",
          size: 100,
          mimeType: "text/plain",
        },
      ],
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it("rejects manifest with empty artifacts array", () => {
    const manifest = buildValidManifest({ artifacts: [] });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it("rejects manifest with invalid test outcome", () => {
    const manifest = buildValidManifest();
    (manifest.testResults as unknown as Record<string, unknown>).outcome = "maybe";
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it("rejects additional properties", () => {
    const manifest = buildValidManifest();
    (manifest as unknown as Record<string, unknown>).extraField = "nope";
    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validateManifest("not an object");
    expect(result.valid).toBe(false);
  });
});
