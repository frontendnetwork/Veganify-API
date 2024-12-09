import { HttpException, HttpStatus } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

import { TranslationService } from "../shared/services/translation.service";
import * as jsonFileReader from "../shared/utils/jsonFileReader";
import { IngredientsV1Controller } from "../v1/ingredients.controller";

jest.mock("../shared/utils/jsonFileReader");
jest.mock("worker_threads", () => ({
  Worker: jest.fn().mockImplementation((_, { workerData }) => {
    return {
      on: jest.fn().mockImplementation((event, callback) => {
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
              !isNotVegan.includes(item.toLowerCase().replace(/\s+/g, "")) &&
              !isMaybeNotVegan.includes(
                item.toLowerCase().replace(/\s+/g, "")
              ) &&
              !isVegan.includes(item.toLowerCase().replace(/\s+/g, ""))
          );

          setTimeout(() => {
            callback({
              notVeganResult,
              maybeNotVeganResult,
              veganResult,
              unknownResult,
            });
          }, 0);
        }
      }),
      postMessage: jest.fn(),
    };
  }),
}));

describe("IngredientsV1Controller", () => {
  let controller: IngredientsV1Controller;
  let translationService: jest.Mocked<TranslationService>;

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IngredientsV1Controller],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translateText: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IngredientsV1Controller>(IngredientsV1Controller);
    translationService = module.get(
      TranslationService
    ) as jest.Mocked<TranslationService>;

    jest
      .spyOn(jsonFileReader, "readJsonFile")
      .mockImplementation((filename: string) => {
        if (filename === "./isnotvegan.json") {
          return Promise.resolve(["milk", "egg"]);
        } else if (filename === "./isvegan.json") {
          return Promise.resolve(["tofu", "soy"]);
        } else if (filename === "./ismaybenotvegan.json") {
          return Promise.resolve(["sugar", "wine"]);
        }
        return Promise.resolve([]);
      });

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
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: ["tofu"],
          not_vegan: ["milk"],
          maybe_not_vegan: ["sugar"],
          unknown: ["unknown"],
        },
      });
    });

    it("should handle ingredients that appear in multiple lists", async () => {
      const res = mockResponse();
      await controller.getIngredients("sugar,soy,milk", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: ["soy"],
          not_vegan: ["milk"],
          maybe_not_vegan: ["sugar"],
          unknown: [],
        },
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
              text: "tofu,milk,sugar,unknown",
              detected_source_language: "",
            },
          ],
        },
      });

      await controller.getIngredients("tofu,milch,zucker,unbekannt", res, true);

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
          maybe_not_vegan: ["sugar"],
          unknown: ["unknown"],
        },
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
      await controller.getIngredients("soy milk,wine,egg white", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: [],
          not_vegan: [],
          maybe_not_vegan: ["wine"],
          unknown: ["soy milk", "egg white"],
        },
      });
    });

    it("should mark product as non-vegan if it contains maybe-not-vegan ingredients", async () => {
      const res = mockResponse();
      await controller.getIngredients("tofu,sugar", res, false);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith({
        code: "OK",
        status: "200",
        message: "Success",
        data: {
          vegan: false,
          surely_vegan: ["tofu"],
          not_vegan: [],
          maybe_not_vegan: ["sugar"],
          unknown: [],
        },
      });
    });
  });
});
