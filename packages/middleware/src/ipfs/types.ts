export interface PinResult {
  cid: string;
  size: number;
  timestamp: string;
}

export interface IpfsGatewayConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface IpfsConfig {
  primary: IpfsGatewayConfig;
  fallback?: IpfsGatewayConfig;
  timeoutMs: number;
  retries: number;
}
