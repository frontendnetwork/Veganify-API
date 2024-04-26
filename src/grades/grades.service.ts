import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { lastValueFrom, Observable } from "rxjs";
import { AxiosResponse } from "axios";

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);
  private readonly pushoverUser = process.env.PUSHOVER_USER;
  private readonly pushoverToken = process.env.PUSHOVER_TOKEN;

  constructor(private httpService: HttpService) {}

  checkBarcode(barcode: string): Observable<AxiosResponse> {
    const url = `https://grades.veganify.app/api/${barcode}.json`;
    return this.httpService.get(url);
  }

  async notifyMissingBarcode(barcode: string): Promise<void> {
    const pushoverUrl = "https://api.pushover.net/1/messages.json";
    const message = `This product has to be checked: ${barcode}`;

    const postData = {
      token: this.pushoverToken,
      user: this.pushoverUser,
      message: message,
      priority: 0,
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(pushoverUrl, postData)
      );
      this.logger.log("Pushover notification sent:", response.data);
    } catch (error) {
      this.logger.warn("Failed to send Pushover notification:", error);
      throw new Error("Error sending Pushover notification");
    }
  }
}
