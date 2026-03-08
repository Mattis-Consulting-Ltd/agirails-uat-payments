import type { Request, Response } from "express";

export interface ProofRecord {
  taskId: string;
  status: "pinned" | "submitted" | "accepted" | "rejected" | "paid";
  cid?: string;
  txHash?: string;
  updatedAt: string;
}

export interface ProofStore {
  get(taskId: string): ProofRecord | undefined;
  set(taskId: string, record: ProofRecord): void;
}

export function createInMemoryProofStore(): ProofStore {
  const store = new Map<string, ProofRecord>();
  return {
    get: (taskId) => store.get(taskId),
    set: (taskId, record) => store.set(taskId, record),
  };
}

export function createProofStatusHandler(store: ProofStore) {
  return (req: Request, res: Response) => {
    const taskId = req.params.taskId as string | undefined;

    if (!taskId) {
      res.status(400).json({ error: "taskId parameter is required" });
      return;
    }

    const record = store.get(taskId);
    if (!record) {
      res.status(404).json({ error: "No proof found for this task" });
      return;
    }

    res.json(record);
  };
}
