import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

import { HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

// bun:test does not export Mocked<T> yet; define a local utility
type Mocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof mock> & T[K]
    : T[K];
};

import { TranslationService } from "../shared/services/translation.service";
import * as jsonFileReader from "../shared/utils/jsonFileReader";
import { IngredientsController } from "../v0/ingredients.controller";

mock.module("../shared/utils/jsonFileReader", () => ({
  readJsonFile: mock(),
}));

describe("IngredientsController", () => {
  let controller: IngredientsController;
  let translationService: Mocked<TranslationService>;
  let isNotVeganIngredients: string[];
  let isVeganIngredients: string[];

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = mock().mockReturnValue(res);
    res.send = mock().mockReturnValue(res);
    res.setHeader = mock().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngredientsController],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translateText: mock(),
          },
        },
      ],
    }).compile();

    controller = module.get<IngredientsController>(IngredientsController);
    translationService = module.get(
      TranslationService
    ) as Mocked<TranslationService>;

    isNotVeganIngredients = ["milk", "egg"];
    isVeganIngredients = ["tofu", "soy"];

    spyOn(jsonFileReader, "readJsonFile").mockImplementation(
      (filename: string): Promise<any> => {
        if (filename === "./isnotvegan.json") {
          return Promise.resolve(isNotVeganIngredients);
        }
        if (filename === "./isvegan.json") {
          return Promise.resolve(isVeganIngredients);
        }
        return Promise.resolve([]);
      }
    );

    await controller.onModuleInit();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getIngredients", () => {
    it("should return ingredients categorization without translation", async () => {
      const res = mockResponse();
      await controller.getIngredients("tofu,milk,unknown", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: ["unknown"],
          not_vegan: ["milk"],
          surely_vegan: ["tofu"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should handle translation when flag is true", async () => {
      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            { detected_source_language: "DE", text: "tofu,milk,unknown" },
          ],
        },
      });
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            { detected_source_language: "", text: "milch,tofu,unbekannt" },
          ],
        },
      });

      await controller.getIngredients("tofu,milch,unbekannt", res, true);

      expect(translationService.translateText).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: ["unbekannt"],
          not_vegan: ["milch"],
          surely_vegan: ["tofu"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("preserves duplicate categories during back translation", async () => {
      isNotVeganIngredients = ["overlap"];
      isVeganIngredients = ["overlap"];
      await controller.onModuleInit();

      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [{ detected_source_language: "DE", text: "overlap" }],
        },
      });
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            { detected_source_language: "", text: "doppelt,doppelt" },
          ],
        },
      });

      await controller.getIngredients("overlap", res, true);

      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: [],
          not_vegan: ["doppelt"],
          surely_vegan: ["doppelt"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("keeps the current category slicing when back translation is short", async () => {
      isNotVeganIngredients = ["overlap"];
      isVeganIngredients = ["overlap"];
      await controller.onModuleInit();

      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [{ detected_source_language: "DE", text: "overlap" }],
        },
      });
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [{ detected_source_language: "", text: "only-one" }],
        },
      });

      await controller.getIngredients("overlap", res, true);

      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: [],
          not_vegan: ["only-one"],
          surely_vegan: [],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("keeps the current empty successful-translation response", async () => {
      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [{ detected_source_language: "DE", text: "" }],
        },
      });

      await controller.getIngredients("tofu", res, true);

      expect(translationService.translateText).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: [],
          not_vegan: [],
          surely_vegan: [],
          vegan: true,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should handle translation service unavailable", async () => {
      const res = mockResponse();
      translationService.translateText.mockRejectedValueOnce(
        new Error("Translate timed out")
      );

      await controller.getIngredients("ingredient", res, true);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.send).toHaveBeenCalledWith({
        code: "Service Unavailable",
        message:
          "Translation service is unavailable. Try again with disabled translation (Results might vary). Add flag ?translate=false to the request.",
        status: "503",
      });
    });

    it("returns an error response when translation fails", async () => {
      const res = mockResponse();
      translationService.translateText.mockRejectedValueOnce(
        new Error("DeepL request failed")
      );

      await controller.getIngredients("tofu,milk", res, true);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.send).toHaveBeenCalledWith({
        code: "Internal Server Error",
        message: "An error occurred during the translation process",
        status: "500",
      });
    });

    it("returns an error response when back translation fails", async () => {
      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            { detected_source_language: "DE", text: "tofu,milk,unknown" },
          ],
        },
      });
      translationService.translateText.mockRejectedValueOnce(
        new Error("Back translation failed")
      );

      await controller.getIngredients("tofu,milch,unbekannt", res, true);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(res.send).toHaveBeenCalledWith({
        code: "Internal Server Error",
        message: "An error occurred during the back translation process",
        status: "500",
      });
    });

    it("should throw 400 when ingredients param is empty string", async () => {
      const res = mockResponse();
      await expect(controller.getIngredients("", res, false)).rejects.toThrow(
        HttpException
      );
    });

    it("should throw 400 when ingredient list is all commas (parses to empty)", async () => {
      const res = mockResponse();
      await expect(
        controller.getIngredients(",,,", res, false)
      ).rejects.toThrow(HttpException);
    });

    it("should handle compound ingredients", async () => {
      const res = mockResponse();
      await controller.getIngredients("soy milk,egg white", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: ["soy milk", "egg white"],
          not_vegan: [],
          surely_vegan: [],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should handle malformed percent-encoding without throwing", async () => {
      // %GG is invalid percent-encoding — decodeURIComponent would throw URIError
      // The hardened parseIngredients falls back to the raw string instead
      const res = mockResponse();
      await controller.getIngredients("tofu,%GGmilk", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      // The raw string is used as-is; tofu is still recognised
      const call = (res.send as ReturnType<typeof mock>).mock.calls[0][0] as {
        data: { surely_vegan: string[] };
      };
      expect(call.data.surely_vegan).toContain("tofu");
    });

    it("decodes URI input and normalizes whitespace and case", async () => {
      const res = mockResponse();
      await controller.getIngredients("%20TOFU%20%2C%20%20MILK%20", res, false);

      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: [],
          not_vegan: ["milk"],
          surely_vegan: ["tofu"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("preserves category overlap when an ingredient is in both lists", async () => {
      isNotVeganIngredients = ["overlap"];
      isVeganIngredients = ["overlap"];
      await controller.onModuleInit();

      const res = mockResponse();
      await controller.getIngredients("overlap", res, false);

      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: [],
          not_vegan: ["overlap"],
          surely_vegan: ["overlap"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should match ingredients containing regex special characters", async () => {
      // Before the fix, "(milk)" would throw a RegExp SyntaxError
      const res = mockResponse();
      await expect(
        controller.getIngredients("(milk),tofu", res, false)
      ).resolves.toBeUndefined();

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_vegan: ["(milk)"],
          not_vegan: [],
          surely_vegan: ["tofu"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });
  });
});
