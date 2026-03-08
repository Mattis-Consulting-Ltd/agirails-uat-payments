import { sendSlackNotification } from "./slack";
import type { ProofEvent } from "./types";

const PROOF_EVENT: ProofEvent = {
  type: "ProofSubmitted",
  taskId: "task-001",
  projectId: "project-001",
  agentId: "agent-001",
  cid: "QmTestCid",
  timestamp: "2026-03-08T12:00:00.000Z",
};

const PAYMENT_EVENT: ProofEvent = {
  type: "PaymentReleased",
  taskId: "task-001",
  projectId: "project-001",
  agentId: "agent-001",
  txHash: "0xabc123def456",
  amount: "0.5 ETH",
  timestamp: "2026-03-08T14:00:00.000Z",
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("sendSlackNotification", () => {
  it("sends formatted message to webhook URL", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 })
    );

    const result = await sendSlackNotification(PROOF_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });

    expect(result.success).toBe(true);
    expect(result.channel).toBe("slack");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://hooks.slack.com/test");
    const body = JSON.parse(options!.body as string);
    expect(body.attachments[0].color).toBe("#2196f3");
  });

  it("uses green color for payment events", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 })
    );

    await sendSlackNotification(PAYMENT_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.attachments[0].color).toBe("#36a64f");
    expect(body.attachments[0].pretext).toContain("Payment Released");
  });

  it("includes Basescan link for tx hash", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 })
    );

    await sendSlackNotification(PAYMENT_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    const txField = body.attachments[0].fields.find(
      (f: { title: string }) => f.title === "Transaction"
    );
    expect(txField.value).toContain("sepolia.basescan.org");
    expect(txField.value).toContain("0xabc123def456");
  });

  it("returns failure on HTTP error", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("invalid_payload", { status: 400 })
    );

    const result = await sendSlackNotification(PROOF_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("400");
  });

  it("returns failure on network error", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("network down"));

    const result = await sendSlackNotification(PROOF_EVENT, {
      webhookUrl: "https://hooks.slack.com/test",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("network down");
  });
});
