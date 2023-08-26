import { Controller, Param, Post, Res } from "@nestjs/common";
import { ProductService } from "./product.service";
import { Response } from "express";
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'warn' });

@Controller("v0/product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post(":barcode?")
  async getProductDetails(
    @Param("barcode") barcode: string,
    @Res() res: Response
  ) {
    try {
      const result = await this.productService.fetchProductDetails(barcode);
      return res.json(result);
    } catch (error) {
      logger.error(error);
      // Handle different types of errors accordingly
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
