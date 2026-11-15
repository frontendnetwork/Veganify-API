import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

// bun:test does not export Mocked<T> yet; define a local utility
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof mock> & T[K]
    : T[K];
};

mock.module("node:fs/promises", () => ({
  readFile: mock().mockResolvedValue(
    JSON.stringify({ PETA_DOES_NOT_TEST: ["Test Brand"] })
  ),
}));

import { CacheService } from "../config/cache.service";
import { ProductService } from "./product.service";

const barcode = "12345678";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("ProductService", () => {
  let service: ProductService;
  let cacheService: Mocked<CacheService>;
  let gradeResponse: Response;
  let openFoodFactsResponse: Response;
  let openEanDbResponse: Response;
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    const mockCacheService = {
      generateGradeKey: mock((value: string) => `grade:${value}`),
      generateOpenEANDBKey: mock((value: string) => `openeandb:${value}`),
      generateOpenFoodFactsKey: mock(
        (value: string) => `openfoodfacts:${value}`
      ),
      generatePetaKey: mock(() => "peta:cruelty-free"),
      generateProductKey: mock((value: string) => `product:${value}`),
      getOrSet: mock(async (_key, fetcher) => fetcher()),
    };

    const module: TestingModule = await Test.createTestingModule({
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

    gradeResponse = jsonResponse({ grade: "A", name: "Grade API Name" });
    openFoodFactsResponse = jsonResponse({
      product: {
        brands: "Test Brand",
        generic_name: "Generic name",
        labels_tags: ["en:vegan", "en:vegetarian", "en:palm-oil-free"],
        nutriscore_grade: "b",
        product_name: "Product name",
        url: "https://world.openfoodfacts.org/product/12345678",
      },
      status: 1,
    });
    openEanDbResponse = new Response(
      "error=0\nname=Fallback\ndetailname=Food\ncontents=300"
    );

    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("https://grades.veganify.app/")) {
        return gradeResponse;
      }
      if (url.startsWith("https://world.openfoodfacts.org/")) {
        return openFoodFactsResponse;
      }
      if (url.startsWith("https://opengtindb.org/")) {
        return openEanDbResponse;
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("maps grade and OpenFoodFacts fields and matches PETA brands", async () => {
    const result = await service.fetchProductDetails(barcode);

    expect(result).toEqual({
      product: {
        animaltestfree: true,
        genericname: "Generic name",
        grade: "A",
        nutriscore: "B",
        palmoil: false,
        productname: "Product name",
        vegan: true,
        vegetarian: true,
      },
      sources: {
        api: "OpenBeautyFacts, PETA Beauty without Bunnies",
        baseuri: "https://world.openfoodfacts.org",
        edituri: "https://world.openfoodfacts.org/product/12345678",
        processed: false,
      },
      status: 200,
    });

    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      `product:${barcode}`,
      expect.any(Function),
      24 * 60 * 60
    );
    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      `grade:${barcode}`,
      expect.any(Function),
      60 * 60
    );
    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      `openfoodfacts:${barcode}`,
      expect.any(Function),
      24 * 60 * 60
    );
    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      "peta:cruelty-free",
      expect.any(Function),
      24 * 60 * 60
    );
  });

  it("maps negative labels and leaves unmatched animal-test status n/a", async () => {
    openFoodFactsResponse = jsonResponse({
      product: {
        brands: "Other Brand",
        labels_tags: ["en:non-vegan", "en:non-vegetarian", "en:palm-oil"],
        url: "https://world.openfoodfacts.org/product/12345678",
      },
      status: 1,
    });

    const result = await service.fetchProductDetails(barcode);

    expect(result.product).toEqual({
      animaltestfree: "n/a",
      genericname: undefined,
      grade: "A",
      nutriscore: "n/a",
      palmoil: true,
      productname: undefined,
      vegan: false,
      vegetarian: false,
    });
    expect(result.sources.api).toBe("OpenFoodFacts");
  });

  it("falls back to OpenEANDB when OpenFoodFacts returns 404", async () => {
    openFoodFactsResponse = new Response(null, { status: 404 });

    const result = await service.fetchProductDetails(barcode);

    expect(result).toEqual({
      product: {
        animaltestfree: "n/a",
        genericname: "n/a",
        grade: "A",
        nutriscore: "n/a",
        palmoil: "n/a",
        productname: "Fallback Food",
        vegan: true,
        vegetarian: true,
      },
      sources: {
        api: "Open EAN Database",
        baseuri: "https://opengtindb.org",
        edituri: `https://opengtindb.org/index.php?cmd=ean1&ean=${barcode}`,
        processed: false,
      },
      status: 200,
    });
    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      `openeandb:${barcode}`,
      expect.any(Function),
      7 * 24 * 60 * 60
    );
  });

  it("throws not found when the OpenEANDB fallback has no product", async () => {
    openFoodFactsResponse = jsonResponse({ product: null, status: 0 });
    openEanDbResponse = new Response("error=1\nname=\ndetailname=");

    await expect(service.fetchProductDetails(barcode)).rejects.toThrow(
      new NotFoundException("Product not found")
    );
  });

  it("propagates provider errors instead of returning a fallback", async () => {
    gradeResponse = new Response("unavailable", { status: 503 });

    await expect(service.fetchProductDetails(barcode)).rejects.toThrow(
      "Grades API error: 503"
    );
  });
});
