import * as vscode from "vscode";
import * as crypto from "node:crypto";
import type { TimeSession } from "../models/timeTracker";

/**
 * Service for sending webhook notifications using the Standard Webhooks specification
 * @see https://www.standardwebhooks.com/
 */
export class WebhookService {
  private webhookUrl: string | undefined;
  private webhookSecret: string | undefined;

  constructor() {
    this.loadConfiguration();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("timeTracking.webhookUrl") ||
        e.affectsConfiguration("timeTracking.webhookSecret")
      ) {
        this.loadConfiguration();
      }
    });
  }

  /**
   * Load webhook configuration from VS Code settings
   */
  private loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration("timeTracking");
    this.webhookUrl = config.get<string>("webhookUrl");
    this.webhookSecret = config.get<string>("webhookSecret");
  }

  /**
   * Sends a webhook event for a completed time tracking session
   * @param session The time tracking session to send
   */
  public async sendSessionEvent(session: TimeSession): Promise<void> {
    // Only send webhook if URL is configured
    if (!this.webhookUrl) {
      return;
    }

    try {
      const eventId = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const payload = {
        id: eventId,
        timestamp,
        type: "time.session.completed",
        data: {
          sessionId: session.id,
          fileName: session.fileName,
          filePath: session.filePath,
          project: session.project,
          startTime: session.startTime.toISOString(),
          endTime: session.endTime?.toISOString(),
          duration: session.duration,
          category: session.category,
          notes: session.notes,
        },
      };

      const payloadString = JSON.stringify(payload);

      // Create headers according to Standard Webhooks spec
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "vscode-time-tracking/standardwebhooks",
        "Webhook-Id": eventId,
        "Webhook-Timestamp": timestamp,
      };

      // Sign the payload if a secret is provided
      if (this.webhookSecret) {
        const signature = this.generateSignature(
          payloadString,
          this.webhookSecret,
        );
        headers["Webhook-Signature"] = `v1,${signature}`;
      }

      // Send the webhook
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
      });

      if (!response.ok) {
        throw new Error(
          `Webhook failed with status ${response.status}: ${await response.text()}`,
        );
      }
    } catch (error) {
      console.error("Error sending webhook:", error);
      // Don't show error to user - webhooks should be non-blocking
    }
  }

  /**
   * Generate HMAC signature for webhook payload using SHA-256
   * @param payload The payload to sign
   * @param secret The webhook secret
   * @returns Hex-encoded signature
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }
}
