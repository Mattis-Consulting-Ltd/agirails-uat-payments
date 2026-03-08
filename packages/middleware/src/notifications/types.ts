export interface ProofEvent {
  type: "ProofSubmitted" | "PaymentReleased";
  taskId: string;
  projectId: string;
  agentId: string;
  cid?: string;
  txHash?: string;
  amount?: string;
  timestamp: string;
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}
