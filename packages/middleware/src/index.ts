import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createApiRouter } from "./api/router.js";
import { createInMemoryProofStore } from "./api/proof-status.js";
import { createIpfsService } from "./ipfs/service.js";
import { createNotificationService } from "./notifications/service.js";
import type { ProofEvent } from "./notifications/types.js";
import { rateLimiter } from "./api/rate-limit.js";
import { requestLogger } from "./api/request-logger.js";
import { errorHandler } from "./api/error-handler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(rateLimiter);
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const proofStore = createInMemoryProofStore();

const ipfsService = createIpfsService({
  primary: {
    url: process.env.IPFS_GATEWAY_URL || "",
    apiKey: process.env.IPFS_PINNING_API_KEY || "",
    apiSecret: process.env.IPFS_PINNING_API_SECRET || "",
  },
  timeoutMs: 10000,
  retries: 3,
});

const notificationService = createNotificationService({
  slack: process.env.SLACK_WEBHOOK_URL
    ? { webhookUrl: process.env.SLACK_WEBHOOK_URL }
    : undefined,
  notion:
    process.env.NOTION_API_KEY && process.env.NOTION_DATABASE_ID
      ? {
          apiKey: process.env.NOTION_API_KEY,
          databaseId: process.env.NOTION_DATABASE_ID,
        }
      : undefined,
});

app.use(
  "/api",
  createApiRouter({
    ipfsService,
    proofStore,
    onProofPinned: (taskId, cid) => {
      proofStore.set(taskId, {
        taskId,
        status: "pinned",
        cid,
        updatedAt: new Date().toISOString(),
      });

      const event: ProofEvent = {
        type: "ProofSubmitted",
        taskId,
        projectId: "",
        agentId: "",
        cid,
        timestamp: new Date().toISOString(),
      };
      notificationService.notify(event).catch((err) => {
        console.error("Notification failed:", err);
      });
    },
  })
);

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Middleware running on port ${PORT}`);
  });
}

export default app;
