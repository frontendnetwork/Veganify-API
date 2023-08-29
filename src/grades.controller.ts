import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { GradesService } from "./grades.service";
import { ApiResponse, ApiTags, ApiBody, ApiProperty } from "@nestjs/swagger";

export class backendResponseDto {
  @ApiProperty({ description: "The barcode requested", example: "12345678" })
  barcode: string = "4066600204404";

  @ApiProperty({
    description: "The name of the product",
    example: "Paulaner Spezi Zero",
  })
  name: string = "Paulaner Spezi Zero";

  @ApiProperty({ description: "The grade of the product", example: "B" })
  grade: string = "B";
}

export class BarcodeDto {
  @ApiProperty({
    description: "The barcode to be checked",
    example: "4066600204404",
  })
  barcode: string = "4066600204404";
}

@Controller("v0/grades")
export class GradesController {
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
      throw new HttpException("Error", HttpStatus.BAD_REQUEST);
    }

    try {
      const response = await this.gradesService
        .checkBarcode(barcode)
        .toPromise();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.send(response?.data);
    } catch (error) {
      if ((error as any).response?.status === 404) {
        await this.gradesService.notifyMissingBarcode(barcode);
        res.send("Sent");
      } else {
        throw new HttpException("Error", HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
