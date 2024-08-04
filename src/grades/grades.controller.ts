import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { GradesService } from "./grades.service";
import { ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { BarcodeDto } from "./dtos/BarcodeDto";
import { backendResponseDto } from "./dtos/backendResponseDto";
import { lastValueFrom } from "rxjs";

@Controller("v0/grades")
export class GradesController {
  private readonly logger = new Logger(GradesController.name);
  constructor(private gradesService: GradesService) {}

  @Post("backend")
  @ApiResponse({
    status: 201,
    description: "Request returned a positive result.",
    type: backendResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Input Error / Bad Request.",
  })
  @ApiResponse({
    status: 500,
    description: "Internal Server Error.",
  })
  @ApiBody({
    type: BarcodeDto,
    description: "The barcode to be checked",
    required: true,
  })
  @ApiTags("Grades")
  async checkBarcode(@Body("barcode") barcode: string, @Res() res: Response) {
    if (
      !barcode ||
      isNaN(Number(barcode)) ||
      barcode.length < 8 ||
      barcode.length > 16 ||
      !/^\d+$/.test(barcode)
    ) {
      throw new HttpException(
        "Input has to be a barcode.",
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const response = await lastValueFrom(
        this.gradesService.checkBarcode(barcode)
      );
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(response?.data);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).response?.status === 404) {
        res.send("Sent");
        await this.gradesService.notifyMissingBarcode(barcode);
      } else {
        throw new HttpException(
          "An error happened on the server.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
    }
  }
}
