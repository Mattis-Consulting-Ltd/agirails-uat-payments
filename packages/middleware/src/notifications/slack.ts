import type { ProofEvent, NotificationResult } from "./types.js";

export interface SlackConfig {
  webhookUrl: string;
  timeoutMs?: number;
}

function formatSlackMessage(event: ProofEvent): object {
  const emoji = event.type === "PaymentReleased" ? ":white_check_mark:" : ":page_facing_up:";
  const title =
    event.type === "PaymentReleased"
      ? "Payment Released"
      : "Proof Submitted";

  const fields = [
    { title: "Task", value: event.taskId, short: true },
    { title: "Project", value: event.projectId, short: true },
    { title: "Agent", value: event.agentId, short: true },
    { title: "Time", value: event.timestamp, short: true },
  ];

  if (event.cid) {
    fields.push({ title: "IPFS CID", value: event.cid, short: false });
  }

  if (event.txHash) {
    fields.push({
      title: "Transaction",
      value: `https://sepolia.basescan.org/tx/${event.txHash}`,
      short: false,
    });
  }

  if (event.amount) {
    fields.push({ title: "Amount", value: event.amount, short: true });
  }

  return {
    attachments: [
      {
        color: event.type === "PaymentReleased" ? "#36a64f" : "#2196f3",
        pretext: `${emoji} *${title}*`,
        fields,
        footer: "AGIRAILS UAT Payments",
        ts: Math.floor(new Date(event.timestamp).getTime() / 1000),
      },
    ],
  };
}

export async function sendSlackNotification(
  event: ProofEvent,
  config: SlackConfig
): Promise<NotificationResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 5000
  );

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formatSlackMessage(event)),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return { channel: "slack", success: false, error: `HTTP ${response.status}: ${text}` };
    }

    return { channel: "slack", success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { channel: "slack", success: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
