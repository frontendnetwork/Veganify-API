import { Controller, Param, Post, Res, Logger } from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";

import { ProductService } from "./product.service";


@Controller("v0/product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  private readonly logger = new Logger(ProductController.name);

  @Post(":barcode?")
  @ApiTags("Product Information")
  @ApiResponse({
    status: 200,
    description: "Request returned a positive result.",
  })
  @ApiResponse({
    status: 404,
    description: "Specified product is not in the database.",
  })
  @ApiResponse({
    status: 400,
    description: "Input Error / Bad Request.",
  })
  @ApiResponse({
    status: 500,
    description: "Internal Server Error.",
  })
  async getProductDetails(
    @Param("barcode") barcode: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.productService.fetchProductDetails(barcode);
      return res.status(200).json(result);
    } catch (error) {
      this.logger.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).status === 404)
        return res
          .status(404)
          .json({ status: 404, error: "Product not found" });
      return res
        .status(500)
        .json({ status: 500, error: "Internal server error" });
    }
  }
}
