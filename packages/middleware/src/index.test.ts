import request from "supertest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.MIDDLEWARE_API_KEY = "test-key";
});

afterAll(() => {
  delete process.env.MIDDLEWARE_API_KEY;
});

describe("middleware app", () => {
  let app: typeof import("./index").default;

  beforeAll(async () => {
    app = (await import("./index")).default;
  });

  it("GET /health returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("POST /api/submit-proof without auth returns 401", async () => {
    const res = await request(app).post("/api/submit-proof").send({});
    expect(res.status).toBe(401);
  });

  it("POST /api/submit-proof with valid key but bad body returns 422", async () => {
    const res = await request(app)
      .post("/api/submit-proof")
      .set("x-api-key", "test-key")
      .send({ version: "1.0.0" });
    expect(res.status).toBe(422);
  });

  it("GET /api/proofs/unknown/status returns 404", async () => {
    const res = await request(app)
      .get("/api/proofs/unknown-task/status")
      .set("x-api-key", "test-key");
    expect(res.status).toBe(404);
  });
});
