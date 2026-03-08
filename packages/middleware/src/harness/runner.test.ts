import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { runHarness } from "./runner";
import type { TaskConfig } from "./types";

const TMP_DIR = join(__dirname, "__test_runner_tmp__");

beforeAll(() => {
  mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

function createArtifact(name: string, content: string): string {
  const path = join(TMP_DIR, name);
  writeFileSync(path, content);
  return path;
}

describe("runHarness", () => {
  it("generates a valid manifest for a successful command", async () => {
    const artifactPath = createArtifact("output.txt", "hello world");
    const config: TaskConfig = {
      taskId: "task-run-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["success"],
      artifactPaths: [artifactPath],
    };

    const result = await runHarness(config);

    expect(result.manifest.version).toBe("1.0.0");
    expect(result.manifest.taskId).toBe("task-run-001");
    expect(result.manifest.testResults.outcome).toBe("pass");
    expect(result.manifest.testResults.passed).toBe(1);
    expect(result.manifest.testResults.failed).toBe(0);
    expect(result.manifest.artifacts).toHaveLength(1);
    expect(result.manifest.artifacts[0]!.name).toBe("output.txt");
    expect(result.manifest.artifacts[0]!.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.raw).toContain("task-run-001");
  });

  it("captures failure when command exits non-zero", async () => {
    const artifactPath = createArtifact("fail-output.txt", "data");
    const config: TaskConfig = {
      taskId: "task-fail-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "sh",
      args: ["-c", "echo error >&2; exit 1"],
      artifactPaths: [artifactPath],
    };

    const result = await runHarness(config);

    expect(result.manifest.testResults.outcome).toBe("fail");
    expect(result.manifest.testResults.failed).toBe(1);
    expect(result.manifest.testResults.cases[0]!.status).toBe("fail");
    expect(result.manifest.testResults.cases[0]!.error).toBeDefined();
  });

  it("includes notes when provided", async () => {
    const artifactPath = createArtifact("noted.txt", "content");
    const config: TaskConfig = {
      taskId: "task-notes-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["ok"],
      artifactPaths: [artifactPath],
      notes: "Ran against staging",
    };

    const result = await runHarness(config);
    expect(result.manifest.notes).toBe("Ran against staging");
  });

  it("hashes multiple artifacts", async () => {
    const a1 = createArtifact("file1.json", '{"a":1}');
    const a2 = createArtifact("file2.json", '{"b":2}');
    const config: TaskConfig = {
      taskId: "task-multi-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["done"],
      artifactPaths: [a1, a2],
    };

    const result = await runHarness(config);
    expect(result.manifest.artifacts).toHaveLength(2);
    expect(result.manifest.artifacts[0]!.sha256).not.toBe(
      result.manifest.artifacts[1]!.sha256
    );
  });

  it("throws when artifact path does not exist", async () => {
    const config: TaskConfig = {
      taskId: "task-bad-path",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["ok"],
      artifactPaths: ["/nonexistent/file.txt"],
    };

    await expect(runHarness(config)).rejects.toThrow();
  });

  it("captures stdout in logs", async () => {
    const artifactPath = createArtifact("log-test.txt", "x");
    const config: TaskConfig = {
      taskId: "task-log-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["hello from stdout"],
      artifactPaths: [artifactPath],
    };

    const result = await runHarness(config);
    expect(result.manifest.logs).toBeDefined();
    expect(result.manifest.logs!.some((l) => l.message.includes("hello from stdout"))).toBe(true);
  });

  it("records duration in test case", async () => {
    const artifactPath = createArtifact("dur-test.txt", "x");
    const config: TaskConfig = {
      taskId: "task-dur-001",
      projectId: "project-001",
      agentId: "agent-001",
      command: "echo",
      args: ["fast"],
      artifactPaths: [artifactPath],
    };

    const result = await runHarness(config);
    expect(result.manifest.testResults.cases[0]!.duration).toBeGreaterThanOrEqual(0);
  });
});
