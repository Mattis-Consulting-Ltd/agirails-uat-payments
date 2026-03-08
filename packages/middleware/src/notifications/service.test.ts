import { NotificationService } from "./service";
import * as slackModule from "./slack";
import * as notionModule from "./notion";
import type { ProofEvent } from "./types";

jest.mock("./slack");
jest.mock("./notion");

const mockedSendSlack = slackModule.sendSlackNotification as jest.MockedFunction<
  typeof slackModule.sendSlackNotification
>;
const mockedSendNotion = notionModule.sendNotionUpdate as jest.MockedFunction<
  typeof notionModule.sendNotionUpdate
>;

const PROOF_EVENT: ProofEvent = {
  type: "ProofSubmitted",
  taskId: "task-001",
  projectId: "project-001",
  agentId: "agent-001",
  cid: "QmTestCid",
  timestamp: new Date().toISOString(),
};

const PAYMENT_EVENT: ProofEvent = {
  type: "PaymentReleased",
  taskId: "task-001",
  projectId: "project-001",
  agentId: "agent-001",
  txHash: "0xabc123",
  amount: "0.5 ETH",
  timestamp: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NotificationService", () => {
  it("sends to both Slack and Notion when configured", async () => {
    mockedSendSlack.mockResolvedValue({ channel: "slack", success: true });
    mockedSendNotion.mockResolvedValue({ channel: "notion", success: true });

    const service = new NotificationService({
      slack: { webhookUrl: "https://hooks.slack.com/test" },
      notion: { apiKey: "ntn_test", databaseId: "db-123" },
    });

    const results = await service.notify(PROOF_EVENT);

    expect(results).toHaveLength(2);
    expect(results[0]!.channel).toBe("slack");
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.channel).toBe("notion");
    expect(results[1]!.success).toBe(true);
  });

  it("sends only to Slack when Notion is not configured", async () => {
    mockedSendSlack.mockResolvedValue({ channel: "slack", success: true });

    const service = new NotificationService({
      slack: { webhookUrl: "https://hooks.slack.com/test" },
    });

    const results = await service.notify(PROOF_EVENT);

    expect(results).toHaveLength(1);
    expect(results[0]!.channel).toBe("slack");
    expect(mockedSendNotion).not.toHaveBeenCalled();
  });

  it("sends only to Notion when Slack is not configured", async () => {
    mockedSendNotion.mockResolvedValue({ channel: "notion", success: true });

    const service = new NotificationService({
      notion: { apiKey: "ntn_test", databaseId: "db-123" },
    });

    const results = await service.notify(PAYMENT_EVENT);

    expect(results).toHaveLength(1);
    expect(results[0]!.channel).toBe("notion");
    expect(mockedSendSlack).not.toHaveBeenCalled();
  });

  it("returns empty array when nothing is configured", async () => {
    const service = new NotificationService({});
    const results = await service.notify(PROOF_EVENT);
    expect(results).toEqual([]);
  });

  it("reports partial failure without throwing", async () => {
    mockedSendSlack.mockResolvedValue({ channel: "slack", success: true });
    mockedSendNotion.mockResolvedValue({
      channel: "notion",
      success: false,
      error: "HTTP 401: Unauthorized",
    });

    const service = new NotificationService({
      slack: { webhookUrl: "https://hooks.slack.com/test" },
      notion: { apiKey: "bad-key", databaseId: "db-123" },
    });

    const results = await service.notify(PROOF_EVENT);

    expect(results).toHaveLength(2);
    expect(results[0]!.success).toBe(true);
    expect(results[1]!.success).toBe(false);
    expect(results[1]!.error).toContain("Unauthorized");
  });

  it("passes correct event data to Slack", async () => {
    mockedSendSlack.mockResolvedValue({ channel: "slack", success: true });

    const service = new NotificationService({
      slack: { webhookUrl: "https://hooks.slack.com/test" },
    });

    await service.notify(PAYMENT_EVENT);

    expect(mockedSendSlack).toHaveBeenCalledWith(PAYMENT_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });
  });

  it("passes correct event data to Notion", async () => {
    mockedSendNotion.mockResolvedValue({ channel: "notion", success: true });

    const service = new NotificationService({
      notion: { apiKey: "ntn_test", databaseId: "db-123" },
    });

    await service.notify(PAYMENT_EVENT);

    expect(mockedSendNotion).toHaveBeenCalledWith(PAYMENT_EVENT, {
      apiKey: "ntn_test",
      databaseId: "db-123",
    });
  });
});
