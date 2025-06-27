import { HttpModule } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";

import { CacheService } from "../config/cache.service";

import { ProductService } from "./product.service";

describe("ProductService", () => {
  let service: ProductService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getOrSet: jest.fn(),
      generateProductKey: jest.fn(),
      generateGradeKey: jest.fn(),
      generatePetaKey: jest.fn(),
      generateOpenFoodFactsKey: jest.fn(),
      generateOpenEANDBKey: jest.fn(),
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
  }, 15000);
});
