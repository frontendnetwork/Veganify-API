import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

import { ProductController } from "../product.controller";
import { type ProductDetails, ProductService } from "../product.service";

describe("ProductController", () => {
  let controller: ProductController;
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: {
            fetchProductDetails: mock(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  describe("getProductDetails", () => {
    it("should return product details when barcode is provided", async () => {
      const barcode = "123456789012";
      const mockResult: ProductDetails = {
        status: 200,
        product: {
          productname: "Product Name",
          genericname: "Generic Name",
          vegan: true,
          vegetarian: "n/a",
          animaltestfree: false,
          palmoil: "n/a",
          nutriscore: "B",
          grade: "Grade A",
        },
        sources: {
          processed: false,
          api: "Test API",
          baseuri: "https://test.com",
          edituri: "https://test.com/edit",
        },
      };
      spyOn(service, "fetchProductDetails").mockResolvedValue(mockResult);

      const mockRes = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, mockRes);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 404 when product is not found", async () => {
      const barcode = "987654321098";
      const error = new NotFoundException("Product not found");
      spyOn(service, "fetchProductDetails").mockRejectedValue(error);

      const res = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, res);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 404,
        error: "Product not found",
      });
    });

    it("should return 500 for other errors", async () => {
      const barcode = "987654321098";
      const error = new Error("Internal Server Error");
      spyOn(service, "fetchProductDetails").mockRejectedValue(error);

      const res = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, res);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 500,
        error: "Internal server error",
      });
    });
  });
});
