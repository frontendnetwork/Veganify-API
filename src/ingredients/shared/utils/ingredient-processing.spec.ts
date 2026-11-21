import { describe, expect, it } from "bun:test";

import {
  normalizeIngredientList,
  parseIngredients,
  sophisticatedMatch,
} from "./ingredient-processing";

describe("ingredient processing helpers", () => {
  describe("parseIngredients", () => {
    it("decodes URI components before splitting ingredients", () => {
      expect(parseIngredients("%20TOFU%20%2C%20%20SOY%20MILK%20")).toEqual([
        "tofu",
        "soy milk",
      ]);
    });

    it("keeps raw input when percent-encoding is malformed", () => {
      expect(parseIngredients(" tofu,%GGMilk ")).toEqual(["tofu", "%ggmilk"]);
    });

    it("returns an empty list for empty or separator-only input", () => {
      expect(parseIngredients("")).toEqual([]);
      expect(parseIngredients(" , , ")).toEqual([]);
    });

    it("trims whitespace and normalizes case", () => {
      expect(parseIngredients("  Soy   Milk , TOFU ")).toEqual([
        "soy   milk",
        "tofu",
      ]);
    });
  });

  describe("normalizeIngredientList", () => {
    it("lowercases list entries without changing their whitespace", () => {
      expect(normalizeIngredientList(["TOFU", " Soy Milk "])).toEqual([
        "tofu",
        " soy milk ",
      ]);
    });
  });

  describe("sophisticatedMatch", () => {
    it("matches case- and whitespace-normalized compound ingredients", () => {
      expect(sophisticatedMatch(" Soy   Milk ", ["soy milk"])).toBe(true);
    });

    it("treats regex-special characters literally", () => {
      expect(
        sophisticatedMatch(
          "milk.protein",
          normalizeIngredientList([" milk.protein "])
        )
      ).toBe(true);
      expect(
        sophisticatedMatch(
          "milk.protein",
          normalizeIngredientList([" milkxprotein "])
        )
      ).toBe(false);
    });
  });
});
