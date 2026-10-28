import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Res,
} from "@nestjs/common";
import { ApiBody, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { BarcodeDto } from "./dtos/BarcodeDto";
import { backendResponseDto } from "./dtos/backendResponseDto";
import { GradesService } from "./grades.service";

@Controller("v0/grades")
export class GradesController {
  constructor(private gradesService: GradesService) {}
  private readonly logger = new Logger(GradesController.name);

  @Post("backend")
  @ApiResponse({
    description: "Request returned a positive result.",
    status: 201,
    type: backendResponseDto,
  })
  @ApiResponse({
    description: "Input Error / Bad Request.",
    status: 400,
  })
  @ApiResponse({
    description: "Internal Server Error.",
    status: 500,
  })
  @ApiBody({
    description: "The barcode to be checked",
    required: true,
    type: BarcodeDto,
  })
  @ApiTags("Grades")
  async checkBarcode(@Body("barcode") barcode: string, @Res() res: Response) {
    if (
      !barcode ||
      Number.isNaN(Number(barcode)) ||
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
      const data = await this.gradesService.checkBarcode(barcode);
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(data);
    } catch (error) {
      const is404 =
        error instanceof Error &&
        "response" in error &&
        (error as { response?: { status?: number } }).response?.status === 404;
      if (is404) {
        // Fire-and-forget the notification; don't block the response
        this.gradesService
          .notifyMissingBarcode(barcode)
          .catch((err: unknown) => {
            this.logger.warn("Failed to notify about missing barcode:", err);
          });
        res.status(202).json({
          code: "Accepted",
          message: "Product not found. It has been queued for review.",
          status: 202,
        });
      } else {
        // biome-ignore lint/style/useErrorCause: Nest's HttpException carries the cause in its options argument below
        throw new HttpException(
          "An error happened on the server.",
          HttpStatus.INTERNAL_SERVER_ERROR,
          { cause: error }
        );
      }
    }
  }
}
