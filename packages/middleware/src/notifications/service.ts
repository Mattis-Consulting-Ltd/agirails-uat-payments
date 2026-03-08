import { sendSlackNotification } from "./slack.js";
import type { SlackConfig } from "./slack.js";
import { sendNotionUpdate } from "./notion.js";
import type { NotionConfig } from "./notion.js";
import type { ProofEvent, NotificationResult } from "./types.js";

export interface NotificationServiceConfig {
  slack?: SlackConfig;
  notion?: NotionConfig;
}

export class NotificationService {
  constructor(private config: NotificationServiceConfig) {}

  async notify(event: ProofEvent): Promise<NotificationResult[]> {
    const promises: Promise<NotificationResult>[] = [];

    if (this.config.slack) {
      promises.push(sendSlackNotification(event, this.config.slack));
    }

    if (this.config.notion) {
      promises.push(sendNotionUpdate(event, this.config.notion));
    }

    if (promises.length === 0) {
      return [];
    }

    return Promise.all(promises);
  }
}

export function createNotificationService(
  config: NotificationServiceConfig
): NotificationService {
  return new NotificationService(config);
}
