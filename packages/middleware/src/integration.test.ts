import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { runHarness } from "./harness/runner";
import { validateManifest } from "./harness/validator";
import { computeManifestHash } from "./harness/hash";
import { createApiRouter } from "./api/router";
import { createInMemoryProofStore } from "./api/proof-status";
import type { IpfsService } from "./ipfs/service";
import { NotificationService } from "./notifications/service";
import type { ProofEvent } from "./notifications/types";
import type { TaskConfig } from "./harness/types";

const TMP_DIR = join(__dirname, "__integration_tmp__");
const TEST_API_KEY = "integration-test-key";

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  process.env.MIDDLEWARE_API_KEY = TEST_API_KEY;
});

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
  delete process.env.MIDDLEWARE_API_KEY;
});

describe("Integration: full proof submission flow", () => {
  it("harness > validate > API submit > IPFS pin > notify", async () => {
    // Step 1: Run the harness to generate a manifest
    const artifactPath = join(TMP_DIR, "integration-artifact.json");
    writeFileSync(artifactPath, JSON.stringify({ result: "success" }));

    const taskConfig: TaskConfig = {
      taskId: "integration-task-001",
      projectId: "integration-project",
      agentId: "integration-agent",
      command: "echo",
      args: ["integration test passed"],
      artifactPaths: [artifactPath],
      notes: "Integration test run",
    };

    const harnessResult = await runHarness(taskConfig);

    // Step 2: Verify the manifest is schema-valid
    const validation = validateManifest(harnessResult.manifest);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);

    // Step 3: Verify manifest hash integrity
    const recomputedHash = computeManifestHash(
      harnessResult.manifest as unknown as Record<string, unknown>
    );
    expect(harnessResult.manifest.manifestHash).toBe(recomputedHash);

    // Step 4: Submit to the API with mocked IPFS
    const pinnedCid = "QmIntegrationTestCid123";
    const proofStore = createInMemoryProofStore();

    const mockIpfs = {
      pinManifest: jest.fn().mockResolvedValue({
        cid: pinnedCid,
        size: 512,
        timestamp: new Date().toISOString(),
      }),
      pinArtifact: jest.fn(),
      buildGatewayUrl: (cid: string) =>
        `https://gateway.pinata.cloud/ipfs/${cid}`,
    } as unknown as IpfsService;

    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createApiRouter({
        ipfsService: mockIpfs,
        proofStore,
        onProofPinned: (taskId, cid) => {
          proofStore.set(taskId, {
            taskId,
            status: "pinned",
            cid,
            updatedAt: new Date().toISOString(),
          });
        },
      })
    );

    const submitRes = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(harnessResult.manifest);

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.cid).toBe(pinnedCid);
    expect(submitRes.body.status).toBe("pinned");

    // Step 5: Verify proof status is tracked
    const statusRes = await request(app)
      .get("/api/proofs/integration-task-001/status")
      .set("x-api-key", TEST_API_KEY);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe("pinned");
    expect(statusRes.body.cid).toBe(pinnedCid);

    // Step 6: Verify notifications can be dispatched
    const notificationService = new NotificationService({});
    const event: ProofEvent = {
      type: "ProofSubmitted",
      taskId: harnessResult.manifest.taskId,
      projectId: harnessResult.manifest.projectId,
      agentId: harnessResult.manifest.agentId,
      cid: pinnedCid,
      timestamp: new Date().toISOString(),
    };

    // With no channels configured, should return empty (no crash)
    const results = await notificationService.notify(event);
    expect(results).toEqual([]);
  });

  it("rejects tampered manifest through the full flow", async () => {
    const artifactPath = join(TMP_DIR, "tamper-artifact.txt");
    writeFileSync(artifactPath, "original content");

    const taskConfig: TaskConfig = {
      taskId: "tamper-task-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["ok"],
      artifactPaths: [artifactPath],
    };

    const harnessResult = await runHarness(taskConfig);

    // Tamper with the manifest content without updating the hash
    const tampered = {
      ...harnessResult.manifest,
      agentId: "malicious-agent",
    };

    const app = express();
    app.use(express.json());
    app.use(
      "/api",
      createApiRouter({
        ipfsService: {
          pinManifest: jest.fn(),
          pinArtifact: jest.fn(),
          buildGatewayUrl: jest.fn(),
        } as unknown as IpfsService,
        proofStore: createInMemoryProofStore(),
      })
    );

    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send(tampered);

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("hash mismatch");
  });

  it("validates manifest schema before attempting IPFS pin", async () => {
    const app = express();
    app.use(express.json());

    const mockPinManifest = jest.fn();
    app.use(
      "/api",
      createApiRouter({
        ipfsService: {
          pinManifest: mockPinManifest,
          pinArtifact: jest.fn(),
          buildGatewayUrl: jest.fn(),
        } as unknown as IpfsService,
        proofStore: createInMemoryProofStore(),
      })
    );

    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", TEST_API_KEY)
      .send({ version: "1.0.0", taskId: "incomplete" });

    expect(res.status).toBe(422);
    // IPFS should never be called if validation fails
    expect(mockPinManifest).not.toHaveBeenCalled();
  });
});
