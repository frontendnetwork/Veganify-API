import { HttpService } from "@nestjs/axios";
import { Injectable, NotFoundException } from "@nestjs/common";
import axios from "axios";
import * as iconv from "iconv-lite";
import * as ini from "ini";
import { firstValueFrom } from "rxjs";

import { CacheService } from "../config/cache.service";

@Injectable()
export class ProductService {
  constructor(
    private httpService: HttpService,
    private cacheService: CacheService
  ) {}

  async fetchProductDetails(barcode: string) {
    const cacheKey = this.cacheService.generateProductKey(barcode);

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchProductDetailsFromAPIs(barcode),
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchProductDetailsFromAPIs(barcode: string) {
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
    if (gradeData !== "404" && gradeData && gradeData.grade) {
      grade = gradeData.grade;
      productname = gradeData.name;
    }

    // Process OpenFoodFacts data
    if (openFoodFactsResponse.status === 1) {
      const product = openFoodFactsResponse.product;
      apiname = "OpenFoodFacts";
      baseuri = "https://world.openfoodfacts.org";
      edituri = product.url;
      productname = product?.product_name;
      genericname = product?.generic_name;

      if (product.nutriscore_grade) {
        nutriscore = product?.nutriscore_grade?.toUpperCase();
      }

      if (product.labels_tags) {
        if (
          product.labels_tags.includes("en:vegan") ||
          product.labels_tags.includes("de:vegan")
        ) {
          vegan = true;
        } else if (
          product.labels_tags.includes("en:non-vegan") ||
          product.labels_tags.includes("de:non-vegan")
        ) {
          vegan = false;
        }

        if (
          product.labels_tags.includes("en:vegetarian") ||
          product.labels_tags.includes("de:vegetarian")
        ) {
          vegetarian = true;
        } else if (product.labels_tags.includes("en:non-vegetarian")) {
          vegetarian = false;
        }

        if (
          product.labels_tags.includes("en:palm-oil-free") ||
          product.labels_tags.includes("de:palmölfrei")
        ) {
          palmoil = false;
        } else if (
          product.labels_tags.includes("en:palm-oil") ||
          product.labels_tags.includes("de:palm-oil")
        ) {
          palmoil = true;
        }
      }

      if (product?.product?.brands) {
        const dnt = petaResponse.PETA_DOES_NOT_TEST;
        const tester = dnt.toString().toLowerCase();

        if (tester.includes(product.product.brands.toLowerCase())) {
          animaltestfree = true;
          apiname = "OpenBeautyFacts, PETA Beauty without Bunnies";
        }
      }
    } else {
      // Try OpenEANDB as fallback
      const openEanDbResponse = await this.fetchOpenEanDb(barcode);
      const array = ini.parse(openEanDbResponse);

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

  // Extract each API call into its own method
  private async fetchGrade(barcode: string) {
    const key = this.cacheService.generateGradeKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        try {
          const gradeResponse = await firstValueFrom(
            this.httpService.get(
              `https://grades.veganify.app/api/${barcode}.json`
            )
          );
          return gradeResponse?.data;
        } catch (error) {
          // If it's a 404, return "404" string as expected by the processing logic
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return "404";
          }
          // Re-throw other errors
          throw error;
        }
      },
      60 * 60 // Cache grades for 1 hour
    );
  }

  private async fetchOpenFoodFacts(barcode: string) {
    const key = this.cacheService.generateOpenFoodFactsKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        try {
          const response = await axios.get(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
          );
          return response.data; // Extract only the data, not the entire response
        } catch (error) {
          // If it's a 404, return a proper response structure
          const axiosError = error as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            return { status: 0, product: null };
          }
          // Re-throw other errors
          throw error;
        }
      },
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchPeta() {
    const key = this.cacheService.generatePetaKey();
    return this.fetchWithCache(
      key,
      async () => {
        const response = await axios.get(
          "https://api.veganify.app/v0/peta/crueltyfree"
        );
        return response.data; // Extract only the data, not the entire response
      },
      24 * 60 * 60 // Cache for 24 hours
    );
  }

  private async fetchOpenEanDb(barcode: string) {
    const key = this.cacheService.generateOpenEANDBKey(barcode);
    return this.fetchWithCache(
      key,
      async () => {
        const response = await axios.get(
          `https://opengtindb.org/?ean=${barcode}&cmd=query&queryid=${process.env.USER_ID_OEANDB}`
        );
        return response.data; // Extract only the data, not the entire response
      },
      7 * 24 * 60 * 60 // Cache for 7 days (less frequently updated)
    );
  }
}
