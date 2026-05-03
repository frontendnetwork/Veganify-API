import { readFile } from "node:fs/promises";
import path from "node:path";
import { Injectable, NotFoundException } from "@nestjs/common";
import * as iconv from "iconv-lite";
import * as ini from "ini";

import { CacheService } from "../config/cache.service";

type Nutriscore = "n/a" | "A" | "B" | "C" | "D" | "E" | "F";
type VeganStatus = boolean | "n/a";

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
    let productname = "n/a";
    let genericname = "n/a";
    let vegan: boolean | "n/a" = "n/a";
    let vegetarian: boolean | "n/a" = "n/a";
    let animaltestfree: boolean | "n/a" = "n/a";
    let palmoil: boolean | "n/a" = "n/a";
    let nutriscore: "n/a" | "A" | "B" | "C" | "D" | "E" | "F" = "n/a";
    let grade = "n/a";
    let apiname = "n/a";
    const processed: boolean = false;
    let baseuri = "n/a";
    let edituri = "n/a";

    // Fetch all data in parallel
    const [gradeData, openFoodFactsResponse, petaResponse] = await Promise.all([
      this.fetchGrade(barcode),
      this.fetchOpenFoodFacts(barcode),
      this.fetchPeta(),
    ]);

    // Process grade data
    if (
      gradeData !== "404" &&
      gradeData &&
      (gradeData as { grade?: string }).grade
    ) {
      grade = (gradeData as { grade: string }).grade;
      productname = (gradeData as { name: string }).name;
    }

    // Process OpenFoodFacts data
    const offData = openFoodFactsResponse as {
      status: number;
      product: Record<string, unknown> | null;
    };
    if (offData.status === 1) {
      const product = offData.product as Record<string, unknown>;
      apiname = "OpenFoodFacts";
      baseuri = "https://world.openfoodfacts.org";
      edituri = product.url as string;
      productname = product?.product_name as string;
      genericname = product?.generic_name as string;

      if (product.nutriscore_grade) {
        nutriscore = (
          product?.nutriscore_grade as string
        )?.toUpperCase() as typeof nutriscore;
      }

      const labelsTags = product.labels_tags as string[] | undefined;
      if (labelsTags) {
        if (
          labelsTags.includes("en:vegan") ||
          labelsTags.includes("de:vegan")
        ) {
          vegan = true;
        } else if (
          labelsTags.includes("en:non-vegan") ||
          labelsTags.includes("de:non-vegan")
        ) {
          vegan = false;
        }

        if (
          labelsTags.includes("en:vegetarian") ||
          labelsTags.includes("de:vegetarian")
        ) {
          vegetarian = true;
        } else if (labelsTags.includes("en:non-vegetarian")) {
          vegetarian = false;
        }

        if (
          labelsTags.includes("en:palm-oil-free") ||
          labelsTags.includes("de:palmölfrei")
        ) {
          palmoil = false;
        } else if (
          labelsTags.includes("en:palm-oil") ||
          labelsTags.includes("de:palm-oil")
        ) {
          palmoil = true;
        }
      }

      if (product?.brands) {
        const dnt = (petaResponse as { PETA_DOES_NOT_TEST: string[] })
          .PETA_DOES_NOT_TEST;
        const brandLower = (product.brands as string).toLowerCase();

        if (dnt.some((entry: string) => entry.toLowerCase() === brandLower)) {
          animaltestfree = true;
          apiname = "OpenBeautyFacts, PETA Beauty without Bunnies";
        }
      }
    } else {
      // Try OpenEANDB as fallback
      const openEanDbResponse = await this.fetchOpenEanDb(barcode);
      const array = ini.parse(openEanDbResponse as string);

      if (array.error === "0") {
        apiname = "Open EAN Database";
        baseuri = "https://opengtindb.org";
        edituri = `https://opengtindb.org/index.php?cmd=ean1&ean=${barcode}`;
        productname = iconv
          .decode(
            Buffer.from(`${array.name} ${array.detailname}`),
            "ISO-8859-1"
          )
          .toString();

        const contents = array.contents;
        if (contents != null && contents >= "128" && contents < "256") {
          vegan = false;
          vegetarian = true;
        } else if (
          (contents != null && contents >= "256" && contents < "384") ||
          (contents >= "384" && contents < "512")
        ) {
          vegan = true;
          vegetarian = true;
        }
      } else {
        throw new NotFoundException("Product not found");
      }
    }

    return {
      status: 200,
      product: {
        productname,
        genericname,
        vegan,
        vegetarian,
        animaltestfree,
        palmoil,
        nutriscore,
        grade,
      },
      sources: {
        processed,
        api: apiname,
        baseuri,
        edituri,
      },
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
          return { status: 0, product: null };
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
