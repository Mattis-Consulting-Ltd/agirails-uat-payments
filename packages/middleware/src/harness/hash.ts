import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import { lookup } from "mime-types";
import type { Artifact } from "./types.js";

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function hashFile(filePath: string): Promise<Artifact> {
  const content = await readFile(filePath);
  const fileStats = await stat(filePath);

  return {
    name: basename(filePath),
    sha256: sha256(content),
    size: fileStats.size,
    mimeType: lookup(filePath) || "application/octet-stream",
  };
}

export function computeManifestHash(
  manifest: Record<string, unknown>
): string {
  const filtered = Object.fromEntries(
    Object.entries(manifest).filter(([key]) => key !== "manifestHash")
  );
  const canonical = JSON.stringify(filtered, Object.keys(filtered).sort());
  return sha256(canonical);
}
