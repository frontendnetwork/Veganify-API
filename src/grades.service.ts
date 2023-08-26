import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import nodemailer from 'nodemailer';
import pino from 'pino';
import { Observable } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class GradesService {
  private readonly logger = pino({ level: process.env.LOG_LEVEL ?? 'warn' });
  private readonly transporter = nodemailer.createTransport({
    host: 'smtp.ionos.de',
    port: 587,
    secure: false,
    auth: {
      user: 'grades@vegancheck.me',
      pass: process.env.MAILPWD,
    },
  });

  constructor(private httpService: HttpService) {}

  checkBarcode(barcode: string): Observable<AxiosResponse> {
    const url = `https://grades.vegancheck.me/api/${barcode}.json`;
    return this.httpService.get(url);
  }

  async notifyMissingBarcode(barcode: string): Promise<void> {
    const mailOptions = {
      from: '"VeganCheck" <grades@vegancheck.me>',
      to: 'philip@brembeck.me',
      subject: `VeganCheck Grade: ${barcode}`,
      html: `This product has to be checked: <b>${barcode}</b>`,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.info('Message sent: %s', info.messageId);
    } catch (error) {
      this.logger.warn(error);
      throw new Error('Error sending mail');
    }
  }
}
