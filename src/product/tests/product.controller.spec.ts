/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

import { ProductController } from "../product.controller";
import { ProductService } from "../product.service";

interface MockResult {
  status: number;
  product: {
    productname: string;
    genericname: string;
    vegan: boolean | "n/a";
    vegetarian: boolean | "n/a";
    animaltestfree: boolean | "n/a";
    palmoil: boolean | "n/a";
    nutriscore: "A" | "B" | "C" | "D" | "E" | "F" | "n/a";
    grade: string;
  };
  sources: any;
}

interface CustomError extends Error {
  status?: number;
}

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
            fetchProductDetails: jest.fn(),
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
      const mockResult: MockResult = {
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
        sources: {},
      };
      jest.spyOn(service, "fetchProductDetails").mockResolvedValue(mockResult);

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.getProductDetails(barcode, mockRes);

      expect(service.fetchProductDetails).toHaveBeenCalledWith(barcode);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockResult);
    });

    it("should return 404 when product is not found", async () => {
      const barcode = "987654321098";
      const error: CustomError = new Error("Error message");
      error.status = 404;
      jest.spyOn(service, "fetchProductDetails").mockRejectedValue(error);

      const res: Response<any, Record<string, any>> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response<any, Record<string, any>>;

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
      jest.spyOn(service, "fetchProductDetails").mockRejectedValue(error);

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
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
