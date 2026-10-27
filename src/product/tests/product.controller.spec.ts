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
        product: {
          animaltestfree: false,
          genericname: "Generic Name",
          grade: "Grade A",
          nutriscore: "B",
          palmoil: "n/a",
          productname: "Product Name",
          vegan: true,
          vegetarian: "n/a",
        },
        sources: {
          api: "Test API",
          baseuri: "https://test.com",
          edituri: "https://test.com/edit",
          processed: false,
        },
        status: 200,
      };
      spyOn(service, "fetchProductDetails").mockResolvedValue(mockResult);

      const mockRes = {
        json: mock(),
        status: mock().mockReturnThis(),
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
        json: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, res);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Product not found",
        status: 404,
      });
    });

    it("should return 500 for other errors", async () => {
      const barcode = "987654321098";
      const error = new Error("Internal Server Error");
      spyOn(service, "fetchProductDetails").mockRejectedValue(error);

      const res = {
        json: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, res);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal server error",
        status: 500,
      });
    });
  });
});
