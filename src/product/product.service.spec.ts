import { beforeEach, describe, expect, it, mock } from "bun:test";
import { HttpModule } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";

// bun:test does not export Mocked<T> yet; define a local utility
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof mock> & T[K]
    : T[K];
};

import { CacheService } from "../config/cache.service";

import { ProductService } from "./product.service";

describe("ProductService", () => {
  let service: ProductService;
  let cacheService: Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getOrSet: mock(),
      generateProductKey: mock(),
      generateGradeKey: mock(),
      generatePetaKey: mock(),
      generateOpenFoodFactsKey: mock(),
      generateOpenEANDBKey: mock(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ProductService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
    cacheService = module.get(CacheService);
  });

  it("should fetch product details", async () => {
    const barcode = "12345678";

    // Mock the cache service to return a sample product
    const mockProduct = {
      status: 200,
      product: {
        productname: "Test Product",
        genericname: "Test Generic",
        vegan: true,
        vegetarian: true,
        animaltestfree: false,
        palmoil: false,
        nutriscore: "A",
        grade: "A+",
      },
      sources: {
        processed: false,
        api: "Test API",
        baseuri: "https://test.com",
        edituri: "https://test.com/edit",
      },
    };

    cacheService.generateProductKey.mockReturnValue(`product:${barcode}`);
    cacheService.getOrSet.mockResolvedValue(mockProduct);

    const result = await service.fetchProductDetails(barcode);

    expect(result).toHaveProperty("status", 200);
    expect(result).toHaveProperty("product");
    expect(result).toHaveProperty("sources");
    expect(cacheService.getOrSet).toHaveBeenCalled();
  }, 15_000);
});
