import type { ProofEvent, NotificationResult } from "./types.js";

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
  timeoutMs?: number;
}

const NOTION_API_BASE = "https://api.notion.com/v1";

function buildNotionProperties(event: ProofEvent): object {
  const properties: Record<string, object> = {
    "Task ID": { title: [{ text: { content: event.taskId } }] },
    "Project ID": { rich_text: [{ text: { content: event.projectId } }] },
    "Agent ID": { rich_text: [{ text: { content: event.agentId } }] },
    Status: {
      select: {
        name:
          event.type === "PaymentReleased" ? "Paid" : "Proof Submitted",
      },
    },
    Timestamp: { date: { start: event.timestamp } },
  };

  if (event.cid) {
    properties["IPFS CID"] = {
      rich_text: [{ text: { content: event.cid } }],
    };
  }

  if (event.txHash) {
    properties["Tx Hash"] = {
      url: `https://sepolia.basescan.org/tx/${event.txHash}`,
    };
  }

  if (event.amount) {
    properties["Amount"] = {
      rich_text: [{ text: { content: event.amount } }],
    };
  }

  return properties;
}

export async function sendNotionUpdate(
  event: ProofEvent,
  config: NotionConfig
): Promise<NotificationResult> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 5000
  );

  try {
    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: config.databaseId },
        properties: buildNotionProperties(event),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      return { channel: "notion", success: false, error: `HTTP ${response.status}: ${text}` };
    }

    return { channel: "notion", success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { channel: "notion", success: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
