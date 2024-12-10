import * as path from "path";
import { Worker } from "worker_threads";

import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { DeeplLanguages } from "deepl";
import { Response } from "express";

import { ParseBooleanPipe } from "../shared/pipes/parse-boolean.pipe";
import { TranslationService } from "../shared/services/translation.service";
import { readJsonFile } from "../shared/utils/jsonFileReader";

import { V1ResponseData } from "./dto/response.dto";

@Controller("v1/ingredients")
export class IngredientsV1Controller implements OnModuleInit {
  constructor(private translationService: TranslationService) {}
  private readonly logger = new Logger(IngredientsV1Controller.name);

  private isNotVegan: string[] = [];
  private isVegan: string[] = [];
  private isMaybeNotVegan: string[] = [];

  async onModuleInit() {
    this.isNotVegan = await this.loadAndPreprocessList("./isnotvegan.json");
    this.isVegan = await this.loadAndPreprocessList("./isvegan.json");
    this.isMaybeNotVegan = await this.loadAndPreprocessList(
      "./ismaybenotvegan.json"
    );
  }

  private async loadAndPreprocessList(filename: string): Promise<string[]> {
    const list = (await readJsonFile(filename)) as string[];
    return list.map((item) => item.toLowerCase());
  }

  private runWorker(ingredients: string[]): Promise<{
    notVeganResult: string[];
    maybeNotVeganResult: string[];
    veganResult: string[];
    unknownResult: string[];
  }> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        path.resolve(__dirname, "ingredient.worker.js"),
        {
          workerData: {
            ingredients,
            isNotVegan: this.isNotVegan,
            isMaybeNotVegan: this.isMaybeNotVegan,
            isVegan: this.isVegan,
          },
        }
      );

      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  @Get(":ingredients")
  @ApiTags("Ingredients")
  @ApiResponse({
    status: 200,
    description: "Request returned a positive result.",
  })
  @ApiResponse({
    status: 500,
    description: "Internal Server Error.",
  })
  @ApiResponse({
    status: 503,
    description:
      "Service Unavailable. Translation service is unavailable. Try again with disabled translation (Results might vary). Add flag ?translate=false to the request.",
  })
  async getIngredients(
    @Param("ingredients") ingredientsParam: string,
    @Res() res: Response,
    @Query("translate", ParseBooleanPipe) translateFlag = true
  ) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Charset", "utf-8");

    if (!ingredientsParam) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          code: "Bad request",
          message: "Missing argument v1/ingredients/:ingredients",
        },
        HttpStatus.BAD_REQUEST
      );
    }

    const ingredients = this.parseIngredients(ingredientsParam);
    let targetLanguage: DeeplLanguages = "EN";

    const shouldTranslate = translateFlag === true;

    try {
      let response: string[];

      if (shouldTranslate) {
        try {
          const translationResult = await this.translationService.translateText(
            ingredients.join(","),
            "EN",
            1500
          );
          targetLanguage = translationResult.data.translations[0]
            .detected_source_language as DeeplLanguages;
          const translated = translationResult.data.translations[0].text;

          response = this.parseIngredients(translated);
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === "Translate timed out") {
              this.logger.error(`Translation service is unavailable: ${error}`);
              res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
                code: "Service Unavailable",
                status: "503",
                message:
                  "Translation service is unavailable. Try again with disabled translation (Results might vary). Add flag ?translate=false to the request.",
              });
              return;
            } else {
              this.logger.error(`Error during translation: ${error}`);
              res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                code: "Internal Server Error",
                status: "500",
                message: "An error occurred during the translation process",
              });
              return;
            }
          } else {
            this.logger.error(`Unknown error: ${error}`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
              code: "Internal Server Error",
              status: "500",
              message: "An unknown error occurred while processing the request",
            });
            return;
          }
        }
      } else {
        response = ingredients;
      }

      const {
        notVeganResult,
        maybeNotVeganResult,
        veganResult,
        unknownResult,
      } = await this.runWorker(response);

      if (
        shouldTranslate &&
        targetLanguage !== "EN" &&
        (notVeganResult.length > 0 ||
          maybeNotVeganResult.length > 0 ||
          veganResult.length > 0 ||
          unknownResult.length > 0)
      ) {
        try {
          const backTranslationResult =
            await this.translationService.translateText(
              [
                ...notVeganResult,
                ...maybeNotVeganResult,
                ...veganResult,
                ...unknownResult,
              ].join(","),
              targetLanguage,
              1500
            );
          const backTranslated = this.parseIngredients(
            backTranslationResult.data.translations[0].text
          );

          const translatedNotVegan = backTranslated.slice(
            0,
            notVeganResult.length
          );
          const translatedMaybeNotVegan = backTranslated.slice(
            notVeganResult.length,
            notVeganResult.length + maybeNotVeganResult.length
          );
          const translatedVegan = backTranslated.slice(
            notVeganResult.length + maybeNotVeganResult.length,
            notVeganResult.length +
              maybeNotVeganResult.length +
              veganResult.length
          );
          const translatedUnknown = backTranslated.slice(
            notVeganResult.length +
              maybeNotVeganResult.length +
              veganResult.length
          );

          this.sendResponse(
            res,
            translatedNotVegan,
            translatedMaybeNotVegan,
            translatedVegan,
            translatedUnknown
          );
        } catch (error) {
          this.logger.error(`Error during back translation: ${error}`);
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            code: "Internal Server Error",
            status: "500",
            message: "An error occurred during the back translation process",
          });
          return;
        }
      } else {
        this.sendResponse(
          res,
          notVeganResult,
          maybeNotVeganResult,
          veganResult,
          unknownResult
        );
      }
    } catch (error) {
      this.logger.error(`Error processing request: ${error}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        code: "Internal Server Error",
        status: "500",
        message: "An error occurred while processing the request",
      });
    }
  }

  private parseIngredients(ingredientsString: string): string[] {
    const decoded = decodeURIComponent(ingredientsString);
    return decoded
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item !== "");
  }

  private sendResponse(
    res: Response,
    notVeganItems: string[],
    maybeNotVeganItems: string[],
    veganItems: string[],
    unknownItems: string[]
  ) {
    const responseData: V1ResponseData = {
      vegan:
        notVeganItems.length === 0 &&
        maybeNotVeganItems.length === 0 &&
        unknownItems.length === 0,
      surely_vegan: veganItems,
      not_vegan: notVeganItems,
      maybe_not_vegan: maybeNotVeganItems,
      unknown: unknownItems,
    };

    res.status(HttpStatus.OK).send({
      code: "OK",
      status: "200",
      message: "Success",
      data: responseData,
    });
  }
}
