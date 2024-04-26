import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import nodemailer from "nodemailer";
import { Observable } from "rxjs";
import { AxiosResponse } from "axios";

@Injectable()
export class GradesService {
  private readonly logger = new Logger(GradesService.name);
  private readonly transporter = nodemailer.createTransport({
    host: "smtp.ionos.de",
    port: 587,
    secure: false,
    auth: {
      user: "grades@veganify.app",
      pass: process.env.MAILPWD,
    },
  });

  constructor(private httpService: HttpService) {}

  checkBarcode(barcode: string): Observable<AxiosResponse> {
    const url = `https://grades.veganify.app/api/${barcode}.json`;
    return this.httpService.get(url);
  }

  async notifyMissingBarcode(barcode: string): Promise<void> {
    const mailOptions = {
      from: '"Veganify" <grades@veganify.app>',
      to: "philip@brembeck.me",
      subject: `Veganify Grade: ${barcode}`,
      html: `This product has to be checked: <b>${barcode}</b>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log("Message sent: %s", info.messageId);
    } catch (error) {
      this.logger.warn(error);
      throw new Error("Error sending mail");
    }
  }
}
