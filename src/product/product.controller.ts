import {
  Controller,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { ProductService } from "./product.service";

@Controller("v0/product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  private readonly logger = new Logger(ProductController.name);

  @Post(":barcode")
  @ApiTags("Product")
  @ApiResponse({
    description: "Request returned a positive result.",
    status: 200,
  })
  @ApiResponse({
    description: "Specified product is not in the database.",
    status: 404,
  })
  @ApiResponse({
    description: "Input Error / Bad Request.",
    status: 400,
  })
  @ApiResponse({
    description: "Internal Server Error.",
    status: 500,
  })
  async getProductDetails(
    @Param("barcode") barcode: string,
    @Res() res: Response
  ) {
    if (!/^\d{4,25}$/.test(barcode)) {
      return res
        .status(400)
        .json({ error: "Invalid barcode format", status: 400 });
    }
    try {
      const result = await this.productService.fetchProductDetails(barcode);
      return res.status(200).json(result);
    } catch (error) {
      this.logger.error(error);

      // Handle NestJS exceptions
      if (error instanceof NotFoundException) {
        return res
          .status(404)
          .json({ error: "Product not found", status: 404 });
      }

      // Handle other errors
      return res
        .status(500)
        .json({ error: "Internal server error", status: 500 });
    }
  }
}
