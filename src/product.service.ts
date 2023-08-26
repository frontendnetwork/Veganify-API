import { Injectable, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import * as ini from "ini";
import * as iconv from "iconv-lite";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

@Injectable()
export class ProductService {
  constructor(private httpService: HttpService) {}

  async fetchProductDetails(barcode: string) {
    let productname: string = "n/a";
    let genericname: string = "n/a";
    let vegan: boolean | "n/a" = "n/a";
    let vegetarian: boolean | "n/a" = "n/a";
    let animaltestfree: boolean | "n/a" = "n/a";
    let palmoil: boolean | "n/a" = "n/a";
    let nutriscore: "n/a" | "A" | "B" | "C" | "D" | "E" | "F" = "n/a";
    let grade: string = "n/a";
    let apiname: string = "n/a";
    let processed: boolean = false;
    let baseuri: string = "n/a";
    let edituri: string = "n/a";

    try {
      const gradeResponse = await this.httpService
        .get(`https://grades.vegancheck.me/api/${barcode}.json`)
        .toPromise();
      if (gradeResponse?.data !== "404") {
        const gradesource = gradeResponse?.data;

        if (gradesource && gradesource.grade) {
          grade = gradesource.grade;
          productname = gradesource.name;
        }
      }
    } catch (error) {
      logger.info(error);
    }

    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (response.data.status === 1) {
      const product = response.data.product;
      apiname = "OpenFoodFacts";
      baseuri = "https://world.openfoodfacts.org";
      edituri = product.url;
      productname = product?.product_name;
      genericname = product?.generic_name;
      nutriscore = product?.nutriscore_grade?.toUpperCase();

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
        const petaResponse = await axios.get(
          "https://api.vegancheck.me/v0/peta/crueltyfree"
        );
        const dnt = petaResponse.data.PETA_DOES_NOT_TEST;
        const tester = dnt.toString().toLowerCase();

        if (tester.includes(product.product.brands.toLowerCase())) {
          animaltestfree = true;
          apiname = "OpenBeautyFacts, PETA Beauty without Bunnies";
        }
      }
    } else {
      const oedb = await axios.get(
        `https://opengtindb.org/?ean=${barcode}&cmd=query&queryid=${process.env.USER_ID_OEANDB}`
      );
      const array = ini.parse(oedb.data);

      if (array.error === "0") {
        apiname = "Open EAN Database";
        baseuri = "https://opengtindb.org";
        edituri = `https://opengtindb.org/index.php?cmd=ean1&ean=${barcode}`;
        productname = iconv
          .decode(
            Buffer.from(array.name + " " + array.detailname),
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
}
