import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { sha256, hashFile, computeManifestHash } from "./hash";

const TMP_DIR = join(__dirname, "__test_tmp__");

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("sha256", () => {
  it("hashes a known string correctly", () => {
    const hash = sha256("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("hashes a buffer", () => {
    const hash = sha256(Buffer.from("hello"));
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });
});

describe("hashFile", () => {
  it("returns correct artifact metadata", async () => {
    const filePath = join(TMP_DIR, "test.txt");
    writeFileSync(filePath, "test content");

    const artifact = await hashFile(filePath);

    expect(artifact.name).toBe("test.txt");
    expect(artifact.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(artifact.size).toBe(12);
    expect(artifact.mimeType).toBe("text/plain");
  });

  it("uses fallback MIME type for unknown extensions", async () => {
    const filePath = join(TMP_DIR, "data.zzzzunknown");
    writeFileSync(filePath, "binary");

    const artifact = await hashFile(filePath);
    expect(artifact.mimeType).toBe("application/octet-stream");
  });
});

describe("computeManifestHash", () => {
  it("produces consistent hash for same input", () => {
    const manifest = { taskId: "t1", projectId: "p1", version: "1.0.0" };
    const hash1 = computeManifestHash(manifest);
    const hash2 = computeManifestHash(manifest);
    expect(hash1).toBe(hash2);
  });

  it("excludes manifestHash field from computation", () => {
    const base = { taskId: "t1", projectId: "p1" };
    const withHash = { ...base, manifestHash: "abcdef" };
    expect(computeManifestHash(base)).toBe(computeManifestHash(withHash));
  });

  it("produces different hash for different input", () => {
    const a = { taskId: "t1" };
    const b = { taskId: "t2" };
    expect(computeManifestHash(a)).not.toBe(computeManifestHash(b));
  });
});
