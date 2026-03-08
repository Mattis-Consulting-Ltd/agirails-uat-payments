import express from "express";
import request from "supertest";
import { createApiRouter } from "./router";
import { createInMemoryProofStore } from "./proof-status";
import type { IpfsService } from "../ipfs/service";
import { computeManifestHash } from "../harness/hash";

const TEST_API_KEY = "test-key-123";

function buildValidManifest() {
  const partial = {
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
      total: 1,
      passed: 1,
      failed: 0,
      outcome: "pass",
      cases: [{ name: "test-1", status: "pass", duration: 100 }],
    },
  };
  const manifestHash = computeManifestHash(partial as Record<string, unknown>);
  return { ...partial, manifestHash };
}

function createTestApp(ipfsMock?: Partial<IpfsService>) {
  const app = express();
  app.use(express.json());

  const proofStore = createInMemoryProofStore();
  const ipfsService = {
    pinManifest: jest.fn().mockResolvedValue({
      cid: "QmTestCid",
      size: 256,
      timestamp: new Date().toISOString(),
    }),
    pinArtifact: jest.fn(),
    buildGatewayUrl: jest.fn(
      (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`
    ),
    ...ipfsMock,
  } as unknown as IpfsService;

  const router = createApiRouter({
    ipfsService,
    proofStore,
  });

  app.use("/api", router);

  return { app, ipfsService, proofStore };
}

beforeAll(() => {
  process.env.MIDDLEWARE_API_KEY = TEST_API_KEY;
});

afterAll(() => {
  delete process.env.MIDDLEWARE_API_KEY;
});

describe("POST /api/submit-proof", () => {
  it("rejects requests without API key", async () => {
    const { app } = createTestApp();
    const res = await request(app).post("/api/submit-proof").send({});
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong API key", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", "wrong-key")
      .send({});
    expect(res.status).toBe(401);
  });

  it("rejects invalid manifest (missing fields)", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send({ version: "1.0.0" });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("schema validation");
  });

  it("rejects manifest with tampered hash", async () => {
    const { app } = createTestApp();
    const manifest = buildValidManifest();
    manifest.manifestHash = "a".repeat(64);

    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(manifest);
    expect(res.status).toBe(422);
    expect(res.body.error).toContain("hash mismatch");
  });

  it("accepts valid manifest and pins to IPFS", async () => {
    const { app, ipfsService } = createTestApp();
    const manifest = buildValidManifest();

    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(manifest);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pinned");
    expect(res.body.cid).toBe("QmTestCid");
    expect(res.body.ipfsUrl).toContain("QmTestCid");
    expect((ipfsService.pinManifest as jest.Mock)).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "task-001" })
    );
  });

  it("returns 502 when IPFS pinning fails", async () => {
    const { app } = createTestApp({
      pinManifest: jest.fn().mockRejectedValue(new Error("IPFS down")),
    });
    const manifest = buildValidManifest();

    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(manifest);

    expect(res.status).toBe(502);
    expect(res.body.error).toContain("Failed to pin");
  });

  it("calls onProofPinned callback when provided", async () => {
    const onProofPinned = jest.fn();
    const app = express();
    app.use(express.json());

    const router = createApiRouter({
      ipfsService: {
        pinManifest: jest.fn().mockResolvedValue({
          cid: "QmCallback",
          size: 100,
          timestamp: new Date().toISOString(),
        }),
        pinArtifact: jest.fn(),
        buildGatewayUrl: (cid: string) =>
          `https://gateway.pinata.cloud/ipfs/${cid}`,
      } as unknown as IpfsService,
      proofStore: createInMemoryProofStore(),
      onProofPinned,
    });
    app.use("/api", router);

    const manifest = buildValidManifest();
    await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(manifest);

    expect(onProofPinned).toHaveBeenCalledWith("task-001", "QmCallback");
  });
});

describe("GET /api/proofs/:taskId/status", () => {
  it("returns 404 for unknown task", async () => {
    const { app } = createTestApp();
    const res = await request(app)
      .get("/api/proofs/unknown-task/status")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(404);
  });

  it("returns proof record when it exists", async () => {
    const { app, proofStore } = createTestApp();
    proofStore.set("task-001", {
      taskId: "task-001",
      status: "pinned",
      cid: "QmTest",
      updatedAt: new Date().toISOString(),
    });

    const res = await request(app)
      .get("/api/proofs/task-001/status")
      .set("x-api-key", TEST_API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pinned");
    expect(res.body.cid).toBe("QmTest");
  });
});
