import { Controller, Post, Body, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { GradesService } from './grades.service';

@Controller('v0/grades')
export class GradesController {
  constructor(private gradesService: GradesService) {}

  @Post('backend')
  async checkBarcode(@Body('barcode') barcode: string, @Res() res: Response) {
    if (
      !barcode ||
      isNaN(Number(barcode)) ||
      barcode.length < 8 ||
      barcode.length > 16 ||
      !/^\d+$/.test(barcode)
    ) {
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.gradesService.checkBarcode(barcode).toPromise();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(response?.data);
    } catch (error) {
      if ((error as any).response?.status === 404) {
        await this.gradesService.notifyMissingBarcode(barcode);
        res.send('Sent');
      } else {
        throw new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
