import { IpfsService } from "./service";
import * as pinataClient from "./pinata-client";
import type { IpfsConfig, PinResult } from "./types";

jest.mock("./pinata-client");

const mockedPinJSON = pinataClient.pinJSON as jest.MockedFunction<
  typeof pinataClient.pinJSON
>;
const mockedPinFile = pinataClient.pinFile as jest.MockedFunction<
  typeof pinataClient.pinFile
>;

const PRIMARY_GATEWAY = {
  url: "https://api.pinata.cloud",
  apiKey: "primary-key",
  apiSecret: "primary-secret",
};

const FALLBACK_GATEWAY = {
  url: "https://fallback.pinata.cloud",
  apiKey: "fallback-key",
  apiSecret: "fallback-secret",
};

const BASE_CONFIG: IpfsConfig = {
  primary: PRIMARY_GATEWAY,
  fallback: FALLBACK_GATEWAY,
  timeoutMs: 5000,
  retries: 2,
};

const MOCK_RESULT: PinResult = {
  cid: "QmTestHash123456789",
  size: 256,
  timestamp: "2026-03-08T12:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("IpfsService.pinManifest", () => {
  it("pins JSON manifest on first attempt", async () => {
    mockedPinJSON.mockResolvedValueOnce(MOCK_RESULT);
    const service = new IpfsService(BASE_CONFIG);

    const result = await service.pinManifest({ taskId: "t1" });

    expect(result).toEqual(MOCK_RESULT);
    expect(mockedPinJSON).toHaveBeenCalledTimes(1);
    expect(mockedPinJSON).toHaveBeenCalledWith(
      { taskId: "t1" },
      PRIMARY_GATEWAY,
      5000
    );
  });

  it("retries on transient failure then succeeds", async () => {
    mockedPinJSON
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce(MOCK_RESULT);

    const service = new IpfsService(BASE_CONFIG);
    const result = await service.pinManifest({ taskId: "t1" });

    expect(result).toEqual(MOCK_RESULT);
    expect(mockedPinJSON).toHaveBeenCalledTimes(2);
  });

  it("falls back to secondary gateway after primary exhausts retries", async () => {
    mockedPinJSON
      .mockRejectedValueOnce(new Error("primary down"))
      .mockRejectedValueOnce(new Error("primary down"))
      .mockResolvedValueOnce(MOCK_RESULT);

    const service = new IpfsService(BASE_CONFIG);
    const result = await service.pinManifest({ taskId: "t1" });

    expect(result).toEqual(MOCK_RESULT);
    expect(mockedPinJSON).toHaveBeenCalledTimes(3);
    expect(mockedPinJSON.mock.calls[2]![1]).toBe(FALLBACK_GATEWAY);
  });

  it("throws after all retries and gateways are exhausted", async () => {
    mockedPinJSON.mockRejectedValue(new Error("all down"));

    const service = new IpfsService(BASE_CONFIG);

    await expect(service.pinManifest({ taskId: "t1" })).rejects.toThrow(
      "IPFS operation failed after all retries and gateways"
    );
    // 2 retries on primary + 2 retries on fallback = 4
    expect(mockedPinJSON).toHaveBeenCalledTimes(4);
  });

  it("works without fallback gateway configured", async () => {
    mockedPinJSON.mockRejectedValue(new Error("down"));

    const configNoFallback: IpfsConfig = {
      primary: PRIMARY_GATEWAY,
      timeoutMs: 5000,
      retries: 2,
    };
    const service = new IpfsService(configNoFallback);

    await expect(service.pinManifest({ taskId: "t1" })).rejects.toThrow(
      "IPFS operation failed"
    );
    // Only 2 retries on primary, no fallback
    expect(mockedPinJSON).toHaveBeenCalledTimes(2);
  });
});

describe("IpfsService.pinArtifact", () => {
  it("pins a binary artifact", async () => {
    mockedPinFile.mockResolvedValueOnce(MOCK_RESULT);
    const service = new IpfsService(BASE_CONFIG);

    const content = Buffer.from("file content");
    const result = await service.pinArtifact(content, "output.json");

    expect(result).toEqual(MOCK_RESULT);
    expect(mockedPinFile).toHaveBeenCalledWith(
      content,
      "output.json",
      PRIMARY_GATEWAY,
      5000
    );
  });

  it("retries and falls back for artifact pinning", async () => {
    mockedPinFile
      .mockRejectedValueOnce(new Error("fail"))
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce(MOCK_RESULT);

    const service = new IpfsService(BASE_CONFIG);
    const result = await service.pinArtifact(Buffer.from("data"), "file.bin");

    expect(result).toEqual(MOCK_RESULT);
    expect(mockedPinFile).toHaveBeenCalledTimes(3);
  });
});

describe("IpfsService.buildGatewayUrl", () => {
  it("returns a valid IPFS gateway URL", () => {
    const service = new IpfsService(BASE_CONFIG);
    const url = service.buildGatewayUrl("QmTestHash");
    expect(url).toBe("https://gateway.pinata.cloud/ipfs/QmTestHash");
  });
});
