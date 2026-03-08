import { sendNotionUpdate } from "./notion";
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
  txHash: "0xabc123",
  amount: "0.5 ETH",
  timestamp: "2026-03-08T14:00:00.000Z",
};

const NOTION_CONFIG = {
  apiKey: "ntn_test_key",
  databaseId: "db-123-456",
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe("sendNotionUpdate", () => {
  it("creates a page in the correct database", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 })
    );

    const result = await sendNotionUpdate(PROOF_EVENT, NOTION_CONFIG);

    expect(result.success).toBe(true);
    expect(result.channel).toBe("notion");

    const [url, options] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.notion.com/v1/pages");
    expect(options!.headers).toEqual(
      expect.objectContaining({
        Authorization: "Bearer ntn_test_key",
        "Notion-Version": "2022-06-28",
      })
    );

    const body = JSON.parse(options!.body as string);
    expect(body.parent.database_id).toBe("db-123-456");
  });

  it("sets status to 'Proof Submitted' for proof events", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 })
    );

    await sendNotionUpdate(PROOF_EVENT, NOTION_CONFIG);

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.properties.Status.select.name).toBe("Proof Submitted");
  });

  it("sets status to 'Paid' for payment events", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 })
    );

    await sendNotionUpdate(PAYMENT_EVENT, NOTION_CONFIG);

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.properties.Status.select.name).toBe("Paid");
  });

  it("includes IPFS CID when present", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 })
    );

    await sendNotionUpdate(PROOF_EVENT, NOTION_CONFIG);

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.properties["IPFS CID"].rich_text[0].text.content).toBe("QmTestCid");
  });

  it("includes Basescan tx link when txHash present", async () => {
    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "page-1" }), { status: 200 })
    );

    await sendNotionUpdate(PAYMENT_EVENT, NOTION_CONFIG);

    const body = JSON.parse(fetchSpy.mock.calls[0]![1]!.body as string);
    expect(body.properties["Tx Hash"].url).toContain("0xabc123");
  });

  it("returns failure on HTTP error", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response("Unauthorized", { status: 401 })
    );

    const result = await sendNotionUpdate(PROOF_EVENT, NOTION_CONFIG);

    expect(result.success).toBe(false);
    expect(result.error).toContain("401");
  });

  it("returns failure on network error", async () => {
    jest.spyOn(global, "fetch").mockRejectedValue(new Error("timeout"));

    const result = await sendNotionUpdate(PROOF_EVENT, NOTION_CONFIG);

    expect(result.success).toBe(false);
    expect(result.error).toContain("timeout");
  });
});
