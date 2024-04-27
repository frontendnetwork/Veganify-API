import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule } from "@nestjs/axios";
import { ProductService } from "./product.service";

describe("ProductService", () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [ProductService],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it("should fetch product details", async () => {
    const barcode = "123456789012";
    const result = await service.fetchProductDetails(barcode);

    expect(result).toHaveProperty("status", 200);
    expect(result).toHaveProperty("product");
    expect(result).toHaveProperty("sources");
  });

  it("should throw NotFoundException when product not found", async () => {
    const barcode = "invalid_barcode";
    await expect(service.fetchProductDetails(barcode)).rejects.toThrow(
      "Product not found"
    );
  });
});
