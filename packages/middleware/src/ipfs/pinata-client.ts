import type { IpfsGatewayConfig, PinResult } from "./types.js";

const PINATA_API_BASE = "https://api.pinata.cloud";

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

async function pinataRequest(
  endpoint: string,
  config: IpfsGatewayConfig,
  body: BodyInit,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<PinataResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${PINATA_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        pinata_api_key: config.apiKey,
        pinata_secret_api_key: config.apiSecret,
        ...headers,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Pinata API error ${response.status}: ${text}`);
    }

    return (await response.json()) as PinataResponse;
  } finally {
    clearTimeout(timer);
  }
}

export async function pinJSON(
  data: unknown,
  config: IpfsGatewayConfig,
  timeoutMs: number
): Promise<PinResult> {
  const result = await pinataRequest(
    "/pinning/pinJSONToIPFS",
    config,
    JSON.stringify({ pinataContent: data }),
    { "Content-Type": "application/json" },
    timeoutMs
  );

  return {
    cid: result.IpfsHash,
    size: result.PinSize,
    timestamp: result.Timestamp,
  };
}

export async function pinFile(
  content: Buffer,
  filename: string,
  config: IpfsGatewayConfig,
  timeoutMs: number
): Promise<PinResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(content)]);
  formData.append("file", blob, filename);

  const result = await pinataRequest(
    "/pinning/pinFileToIPFS",
    config,
    formData,
    {},
    timeoutMs
  );

  return {
    cid: result.IpfsHash,
    size: result.PinSize,
    timestamp: result.Timestamp,
  };
}
