import { readFile } from "node:fs/promises";
import path from "node:path";

import { Injectable, NotFoundException } from "@nestjs/common";
import * as ini from "ini";

import { CacheService } from "../config/cache.service";
import {
  createDefaultProductResponseMapping,
  mapGradeResponse,
  mapOpenEanDbResponse,
  mapOpenFoodFactsResponse,
  type VeganStatus,
} from "./product.response-mappers";

type Nutriscore = "n/a" | "A" | "B" | "C" | "D" | "E" | "F";

export interface ProductDetails {
  product: {
    productname: string;
    genericname: string;
    vegan: VeganStatus;
    vegetarian: VeganStatus;
    animaltestfree: VeganStatus;
    palmoil: VeganStatus;
    nutriscore: Nutriscore;
    grade: string;
  };
  sources: {
    processed: boolean;
    api: string;
    baseuri: string;
    edituri: string;
  };
  status: number;
}

const FETCH_TIMEOUT_MS = 8000;

@Injectable()
export class ProductService {
  constructor(private cacheService: CacheService) {}

  async fetchProductDetails(barcode: string): Promise<ProductDetails> {
    const cacheKey = this.cacheService.generateProductKey(barcode);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchProductDetailsFromAPIs(barcode),
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchProductDetailsFromAPIs(
    barcode: string
  ): Promise<ProductDetails> {
    let mapping = createDefaultProductResponseMapping();
    const processed = false;

    // Fetch all data in parallel
    const [gradeData, openFoodFactsResponse, petaResponse] = await Promise.all([
      this.fetchGrade(barcode),
      this.fetchOpenFoodFacts(barcode),
      this.fetchPeta(),
    ]);

    mapping = mapGradeResponse(mapping, gradeData);

    // Process OpenFoodFacts data
    const offData = openFoodFactsResponse as {
      status: number;
      product: Record<string, unknown> | null;
    };
    if (offData.status === 1) {
      const product = offData.product as Record<string, unknown>;
      mapping = mapOpenFoodFactsResponse(mapping, product, petaResponse);
    } else {
      // Try OpenEANDB as fallback
      const openEanDbResponse = await this.fetchOpenEanDb(barcode);
      const array = ini.parse(openEanDbResponse as string);

      if (array.error === "0") {
        mapping = mapOpenEanDbResponse(mapping, barcode, array);
      } else {
        throw new NotFoundException("Product not found");
      }
    }

    return {
      product: {
        animaltestfree: mapping.animaltestfree,
        genericname: mapping.genericname,
        grade: mapping.grade,
        nutriscore: mapping.nutriscore,
        palmoil: mapping.palmoil,
        productname: mapping.productname,
        vegan: mapping.vegan,
        vegetarian: mapping.vegetarian,
      },
      sources: {
        api: mapping.api,
        baseuri: mapping.baseuri,
        edituri: mapping.edituri,
        processed,
      },
      status: 200,
    };
  }

  // Generic helper for cached API calls
  private fetchWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    return this.cacheService.getOrSet(key, fetchFn, ttlSeconds);
  }

  private async fetchGrade(barcode: string) {
    const key = this.cacheService.generateGradeKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        const response = await fetch(
          `https://grades.veganify.app/api/${barcode}.json`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
        );
        if (response.status === 404) {
          return "404";
        }
        if (!response.ok) {
          throw new Error(`Grades API error: ${response.status}`);
        }
        return response.json();
      },
      60 * 60 // Cache grades for 1 hour
    );
  }

  private async fetchOpenFoodFacts(barcode: string) {
    const key = this.cacheService.generateOpenFoodFactsKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        const response = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
        );
        if (response.status === 404) {
          return { product: null, status: 0 };
        }
        if (!response.ok) {
          throw new Error(`OpenFoodFacts error: ${response.status}`);
        }
        return response.json();
      },
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchPeta() {
    const key = this.cacheService.generatePetaKey();
    return this.fetchWithCache(
      key,
      async () => {
        const filePath = path.resolve(process.cwd(), "peta_cruelty_free.json");
        const raw = await readFile(filePath, "utf-8");
        return JSON.parse(raw);
      },
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchOpenEanDb(barcode: string) {
    const key = this.cacheService.generateOpenEANDBKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        const response = await fetch(
          `https://opengtindb.org/?ean=${barcode}&cmd=query&queryid=${process.env.USER_ID_OEANDB}`,
          { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
        );
        if (!response.ok) {
          throw new Error(`OpenEANDB error: ${response.status}`);
        }
        return response.text(); // Returns INI-formatted text
      },
      7 * 24 * 60 * 60 // Cache for 7 days
    );
  }
}
