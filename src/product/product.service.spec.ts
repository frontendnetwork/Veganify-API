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
    const barcode = "12345678";
    const result = await service.fetchProductDetails(barcode);

    expect(result).toHaveProperty("status", 200);
    expect(result).toHaveProperty("product");
    expect(result).toHaveProperty("sources");
  }, 15000);
});
