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

    spyOn(jsonFileReader, "readJsonFile").mockImplementation(
      (filename: string): Promise<any> => {
        if (filename === "./isnotvegan.json") {
          return Promise.resolve(["milk", "egg"]);
        }
        if (filename === "./isvegan.json") {
          return Promise.resolve(["tofu", "soy"]);
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
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: ["tofu"],
          not_vegan: ["milk"],
          maybe_vegan: ["unknown"],
        },
      });
    });

    it.skip("should handle translation when flag is true", async () => {
      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            { detected_source_language: "DE", text: "tofu,milk,unknown" },
          ],
        },
      });

      await controller.getIngredients("tofu,milch,unbekannt", res, true);

      expect(translationService.translateText).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: ["tofu"],
          not_vegan: ["milk"],
          maybe_vegan: ["unknown"],
        },
      });
    });

    // Not testable due to redis caching
    it.skip("should handle translation service unavailable", async () => {
      const res = mockResponse();
      translationService.translateText.mockRejectedValueOnce(
        new Error("Translate timed out")
      );

      await controller.getIngredients("ingredient", res, true);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(res.send).toHaveBeenCalledWith({
        code: "Service Unavailable",
        status: "503",
        message:
          "Translation service is unavailable. Try again with disabled translation (Results might vary). Add flag ?translate=false to the request.",
      });
    });

    it("should handle missing ingredients parameter", async () => {
      const res = mockResponse();

      await expect(controller.getIngredients("", res, false)).rejects.toThrow(
        HttpException
      );
    });

    it("should handle compound ingredients", async () => {
      const res = mockResponse();
      await controller.getIngredients("soy milk,egg white", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: [],
          not_vegan: [],
          maybe_vegan: ["soy milk", "egg white"],
        },
      });
    });
  });
});
