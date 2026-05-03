import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);
  private readonly pushoverUser = process.env.PUSHOVER_USER;
  private readonly pushoverToken = process.env.PUSHOVER_TOKEN;

  async checkBarcode(barcode: string): Promise<unknown> {
    const url = `https://grades.veganify.app/api/${barcode}.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!response.ok) {
      throw Object.assign(new Error(`Grades API error: ${response.status}`), {
        response: { status: response.status },
      });
    }

    return response.json();
  }

  async notifyMissingBarcode(barcode: string): Promise<void> {
    const pushoverUrl = "https://api.pushover.net/1/messages.json";
    const message = `This product has to be checked: ${barcode}`;

    try {
      const response = await fetch(pushoverUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: this.pushoverToken,
          user: this.pushoverUser,
          message,
          priority: 0,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Pushover responded with ${response.status}`);
      }

      this.logger.log("Pushover notification sent");
    } catch (error) {
      this.logger.warn("Failed to send Pushover notification:", error);
    }
  }
}
