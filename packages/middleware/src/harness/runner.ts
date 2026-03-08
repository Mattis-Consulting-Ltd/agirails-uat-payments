import { spawn } from "node:child_process";
import { hashFile, computeManifestHash } from "./hash.js";
import { validateManifest } from "./validator.js";
import type {
  TaskConfig,
  HarnessResult,
  LogEntry,
  TestResults,
  ProofManifest,
} from "./types.js";

interface CommandOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

function runCommand(command: string, args: string[] = []): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const proc = spawn(command, args, { shell: true });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);

    proc.on("close", (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        duration: Date.now() - start,
      });
    });
  });
}

function buildTestResults(output: CommandOutput): TestResults {
  const passed = output.exitCode === 0 ? 1 : 0;
  const failed = output.exitCode === 0 ? 0 : 1;

  return {
    total: 1,
    passed,
    failed,
    outcome: output.exitCode === 0 ? "pass" : "fail",
    cases: [
      {
        name: "task-execution",
        status: output.exitCode === 0 ? "pass" : "fail",
        duration: output.duration,
        ...(output.exitCode !== 0 && {
          error: output.stderr.slice(0, 1000) || `Exit code: ${output.exitCode}`,
        }),
      },
    ],
  };
}

function buildLogs(output: CommandOutput): LogEntry[] {
  const now = new Date().toISOString();
  const logs: LogEntry[] = [];

  if (output.stdout.trim()) {
    logs.push({ timestamp: now, level: "info", message: output.stdout.trim().slice(0, 5000) });
  }

  if (output.stderr.trim()) {
    logs.push({ timestamp: now, level: "error", message: output.stderr.trim().slice(0, 5000) });
  }

  return logs;
}

export async function runHarness(config: TaskConfig): Promise<HarnessResult> {
  const output = await runCommand(config.command, config.args);

  const artifacts = await Promise.all(
    config.artifactPaths.map((p) => hashFile(p))
  );

  const testResults = buildTestResults(output);
  const logs = buildLogs(output);

  const partial: Omit<ProofManifest, "manifestHash"> = {
    version: "1.0.0",
    taskId: config.taskId,
    projectId: config.projectId,
    agentId: config.agentId,
    timestamp: new Date().toISOString(),
    artifacts,
    testResults,
    ...(logs.length > 0 && { logs }),
    ...(config.notes && { notes: config.notes }),
  };

  const manifestHash = computeManifestHash(partial as Record<string, unknown>);
  const manifest: ProofManifest = { ...partial, manifestHash };

  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(
      `Generated manifest failed schema validation:\n${validation.errors.join("\n")}`
    );
  }

  return {
    manifest,
    raw: JSON.stringify(manifest, null, 2),
  };
}
