export interface Artifact {
  name: string;
  sha256: string;
  size: number;
  mimeType: string;
}

export interface TestCase {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  outcome: "pass" | "fail";
  cases: TestCase[];
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface ProofManifest {
  version: "1.0.0";
  taskId: string;
  projectId: string;
  agentId: string;
  timestamp: string;
  artifacts: Artifact[];
  testResults: TestResults;
  logs?: LogEntry[];
  notes?: string;
  manifestHash: string;
}

export interface TaskConfig {
  taskId: string;
  projectId: string;
  agentId: string;
  command: string;
  args?: string[];
  artifactPaths: string[];
  notes?: string;
}

export interface HarnessResult {
  manifest: ProofManifest;
  raw: string;
}
