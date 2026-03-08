import { pinJSON, pinFile } from "./pinata-client.js";
import type { IpfsConfig, PinResult, IpfsGatewayConfig } from "./types.js";

async function withRetryAndFallback<T>(
  operation: (config: IpfsGatewayConfig) => Promise<T>,
  ipfsConfig: IpfsConfig
): Promise<T> {
  let lastError: Error | undefined;

  const gateways = [
    ipfsConfig.primary,
    ...(ipfsConfig.fallback ? [ipfsConfig.fallback] : []),
  ];

  for (const gateway of gateways) {
    for (let attempt = 1; attempt <= ipfsConfig.retries; attempt++) {
      try {
        return await operation(gateway);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < ipfsConfig.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw new Error(
    `IPFS operation failed after all retries and gateways: ${lastError?.message}`
  );
}

export class IpfsService {
  constructor(private config: IpfsConfig) {}

  async pinManifest(manifest: unknown): Promise<PinResult> {
    return withRetryAndFallback(
      (gateway) => pinJSON(manifest, gateway, this.config.timeoutMs),
      this.config
    );
  }

  async pinArtifact(content: Buffer, filename: string): Promise<PinResult> {
    return withRetryAndFallback(
      (gateway) => pinFile(content, filename, gateway, this.config.timeoutMs),
      this.config
    );
  }

  buildGatewayUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}

export function createIpfsService(config: IpfsConfig): IpfsService {
  return new IpfsService(config);
}
