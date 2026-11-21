import * as iconv from "iconv-lite";
import type * as ini from "ini";

export type VeganStatus = boolean | "n/a";
type Nutriscore = "n/a" | "A" | "B" | "C" | "D" | "E" | "F";

export interface ProductResponseMapping {
  animaltestfree: VeganStatus;
  api: string;
  baseuri: string;
  edituri: string;
  genericname: string;
  grade: string;
  nutriscore: Nutriscore;
  palmoil: VeganStatus;
  productname: string;
  vegan: VeganStatus;
  vegetarian: VeganStatus;
}

export function createDefaultProductResponseMapping(): ProductResponseMapping {
  return {
    animaltestfree: "n/a",
    api: "n/a",
    baseuri: "n/a",
    edituri: "n/a",
    genericname: "n/a",
    grade: "n/a",
    nutriscore: "n/a",
    palmoil: "n/a",
    productname: "n/a",
    vegan: "n/a",
    vegetarian: "n/a",
  };
}

export function mapGradeResponse(
  mapping: ProductResponseMapping,
  gradeData: unknown
): ProductResponseMapping {
  if (
    gradeData !== "404" &&
    gradeData &&
    (gradeData as { grade?: string }).grade
  ) {
    const { grade, name: productname } = gradeData as {
      grade: string;
      name: string;
    };
    return { ...mapping, grade, productname };
  }

  return mapping;
}

export function mapOpenFoodFactsResponse(
  current: ProductResponseMapping,
  product: Record<string, unknown>,
  petaResponse: unknown
): ProductResponseMapping {
  let mapping: ProductResponseMapping = {
    ...current,
    api: "OpenFoodFacts",
    baseuri: "https://world.openfoodfacts.org",
    edituri: product.url as string,
    genericname: product.generic_name as string,
    productname: product.product_name as string,
  };

  if (product.nutriscore_grade) {
    mapping = {
      ...mapping,
      nutriscore: (
        product.nutriscore_grade as string
      ).toUpperCase() as Nutriscore,
    };
  }

  const labelsTags = product.labels_tags as string[] | undefined;
  if (labelsTags) {
    if (labelsTags.includes("en:vegan") || labelsTags.includes("de:vegan")) {
      mapping = { ...mapping, vegan: true };
    } else if (
      labelsTags.includes("en:non-vegan") ||
      labelsTags.includes("de:non-vegan")
    ) {
      mapping = { ...mapping, vegan: false };
    }

    if (
      labelsTags.includes("en:vegetarian") ||
      labelsTags.includes("de:vegetarian")
    ) {
      mapping = { ...mapping, vegetarian: true };
    } else if (labelsTags.includes("en:non-vegetarian")) {
      mapping = { ...mapping, vegetarian: false };
    }

    if (
      labelsTags.includes("en:palm-oil-free") ||
      labelsTags.includes("de:palmölfrei")
    ) {
      mapping = { ...mapping, palmoil: false };
    } else if (
      labelsTags.includes("en:palm-oil") ||
      labelsTags.includes("de:palm-oil")
    ) {
      mapping = { ...mapping, palmoil: true };
    }
  }

  if (product.brands) {
    const petaBrands = (petaResponse as { PETA_DOES_NOT_TEST: string[] })
      .PETA_DOES_NOT_TEST;
    const brandLower = (product.brands as string).toLowerCase();

    if (petaBrands.some((entry) => entry.toLowerCase() === brandLower)) {
      mapping = {
        ...mapping,
        animaltestfree: true,
        api: "OpenBeautyFacts, PETA Beauty without Bunnies",
      };
    }
  }

  return mapping;
}

export function mapOpenEanDbResponse(
  current: ProductResponseMapping,
  barcode: string,
  response: ReturnType<typeof ini.parse>
): ProductResponseMapping {
  let { vegan, vegetarian } = current;
  const { contents, detailname, name } = response;

  if (
    contents !== null &&
    contents !== undefined &&
    contents >= "128" &&
    contents < "256"
  ) {
    vegan = false;
    vegetarian = true;
  } else if (
    (contents !== null &&
      contents !== undefined &&
      contents >= "256" &&
      contents < "384") ||
    (contents >= "384" && contents < "512")
  ) {
    vegan = true;
    vegetarian = true;
  }

  const productname = iconv
    .decode(Buffer.from(`${name} ${detailname}`), "ISO-8859-1")
    .toString();

  return {
    ...current,
    api: "Open EAN Database",
    baseuri: "https://opengtindb.org",
    edituri: `https://opengtindb.org/index.php?cmd=ean1&ean=${barcode}`,
    productname,
    vegan,
    vegetarian,
  };
}
