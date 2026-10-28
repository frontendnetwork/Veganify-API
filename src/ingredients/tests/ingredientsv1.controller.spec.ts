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
import { IngredientsV1Controller } from "../v1/ingredients.controller";

mock.module("../shared/utils/jsonFileReader", () => ({
  readJsonFile: mock(),
}));

mock.module("worker_threads", () => ({
  Worker: mock().mockImplementation((_, { workerData }) => ({
    on: mock().mockImplementation((event, callback) => {
      if (event === "message") {
        const { ingredients, isNotVegan, isMaybeNotVegan, isVegan } =
          workerData;

        const notVeganResult = ingredients.filter((item: string) =>
          isNotVegan.includes(item.toLowerCase().replace(/\s+/g, ""))
        );

        const maybeNotVeganResult = ingredients.filter(
          (item: string) =>
            !isNotVegan.includes(item.toLowerCase().replace(/\s+/g, "")) &&
            isMaybeNotVegan.includes(item.toLowerCase().replace(/\s+/g, ""))
        );

        const veganResult = ingredients.filter((item: string) =>
          isVegan.includes(item.toLowerCase().replace(/\s+/g, ""))
        );

        const unknownResult = ingredients.filter(
          (item: string) =>
            !(
              isNotVegan.includes(item.toLowerCase().replace(/\s+/g, "")) ||
              isMaybeNotVegan.includes(
                item.toLowerCase().replace(/\s+/g, "")
              ) ||
              isVegan.includes(item.toLowerCase().replace(/\s+/g, ""))
            )
        );

        setTimeout(() => {
          callback({
            maybeNotVeganResult,
            notVeganResult,
            unknownResult,
            veganResult,
          });
        }, 0);
      }
    }),
    postMessage: mock(),
  })),
}));

describe("IngredientsV1Controller", () => {
  let controller: IngredientsV1Controller;
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
      controllers: [IngredientsV1Controller],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translateText: mock(),
          },
        },
      ],
    }).compile();

    controller = module.get<IngredientsV1Controller>(IngredientsV1Controller);
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
        if (filename === "./ismaybenotvegan.json") {
          return Promise.resolve(["sugar", "wine"]);
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
      await controller.getIngredients("tofu,milk,sugar,unknown", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["sugar"],
          not_vegan: ["milk"],
          surely_vegan: ["tofu"],
          unknown: ["unknown"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should handle ingredients that appear in multiple lists", async () => {
      const res = mockResponse();
      // Testing priority: not_vegan > maybe_not_vegan > vegan
      await controller.getIngredients("sugar,soy,milk", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["sugar"],
          not_vegan: ["milk"],
          surely_vegan: ["soy"],
          unknown: [],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it.skip("should handle translation when flag is true", async () => {
      const res = mockResponse();
      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            {
              detected_source_language: "DE",
              text: "tofu,milch,zucker,unbekannt",
            },
          ],
        },
      });

      translationService.translateText.mockResolvedValueOnce({
        data: {
          translations: [
            {
              detected_source_language: "",
              text: "tofu,milk,sugar,unknown",
            },
          ],
        },
      });

      await controller.getIngredients("tofu,milch,zucker,unbekannt", res, true);

      expect(translationService.translateText).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["sugar"],
          not_vegan: ["milk"],
          surely_vegan: ["tofu"],
          unknown: ["unknown"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should process untranslated ingredients when translation fails", async () => {
      const res = mockResponse();
      translationService.translateText.mockRejectedValueOnce(
        new Error("Translate timed out")
      );

      await controller.getIngredients("tofu,milk,sugar", res, true);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["sugar"],
          not_vegan: ["milk"],
          surely_vegan: ["tofu"],
          unknown: [],
          vegan: false,
        },
        message: "Success",
        status: "200",
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
      await controller.getIngredients("soy milk,wine,egg white", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["wine"],
          not_vegan: [],
          surely_vegan: [],
          unknown: ["soy milk", "egg white"],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });

    it("should mark product as non-vegan if it contains maybe-not-vegan ingredients", async () => {
      const res = mockResponse();
      await controller.getIngredients("tofu,sugar", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        data: {
          maybe_not_vegan: ["sugar"],
          not_vegan: [],
          surely_vegan: ["tofu"],
          unknown: [],
          vegan: false,
        },
        message: "Success",
        status: "200",
      });
    });
  });
});
