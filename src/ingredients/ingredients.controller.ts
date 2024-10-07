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
import { Response } from "express";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { TranslationService } from "./translation.service";
import { ParseBooleanPipe } from "./parse-boolean.pipe";
import { readJsonFile } from "./jsonFileReader";
import { DeeplLanguages } from "deepl";

@Controller("v0/ingredients")
export class IngredientsController implements OnModuleInit {
  constructor(private translationService: TranslationService) {}
  private readonly logger = new Logger(IngredientsController.name);

  private isNotVegan: string[] = [];
  private isVegan: string[] = [];

  async onModuleInit() {
    this.isNotVegan = await this.loadAndPreprocessList("./isnotvegan.json");
    this.isVegan = await this.loadAndPreprocessList("./isvegan.json");
  }

  private async loadAndPreprocessList(filename: string): Promise<string[]> {
    const list = (await readJsonFile(filename)) as string[];
    return list.map((item) => item.toLowerCase());
  }

  private sophisticatedMatch(ingredient: string, list: string[]): boolean {
    const normalizedIngredient = ingredient.toLowerCase().replace(/\s+/g, "");

    if (list.includes(normalizedIngredient)) return true;

    const wordBoundaryRegex = new RegExp(`\\b${normalizedIngredient}\\b`);
    if (list.some((item) => wordBoundaryRegex.test(item.replace(/\s+/g, ""))))
      return true;

    return false;
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
          message: "Missing argument v0/ingredients/:ingredients",
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

      // Use sophisticatedMatch for categorizing ingredients
      let notVeganResult = response.filter((item: string) =>
        this.sophisticatedMatch(item, this.isNotVegan)
      );
      let veganResult = response.filter((item: string) =>
        this.sophisticatedMatch(item, this.isVegan)
      );
      let unknownResult = response.filter(
        (item: string) =>
          !this.sophisticatedMatch(item, this.isNotVegan) &&
          !this.sophisticatedMatch(item, this.isVegan)
      );

      if (
        shouldTranslate &&
        targetLanguage !== "EN" &&
        (notVeganResult.length > 0 ||
          veganResult.length > 0 ||
          unknownResult.length > 0)
      ) {
        try {
          const backTranslationResult =
            await this.translationService.translateText(
              [...notVeganResult, ...veganResult, ...unknownResult].join(","),
              targetLanguage,
              1500
            );
          const backTranslated = this.parseIngredients(
            backTranslationResult.data.translations[0].text
          );

          notVeganResult = backTranslated.slice(0, notVeganResult.length);
          veganResult = backTranslated.slice(
            notVeganResult.length,
            notVeganResult.length + veganResult.length
          );
          unknownResult = backTranslated.slice(
            notVeganResult.length + veganResult.length
          );

          this.sendResponse(res, notVeganResult, veganResult, unknownResult);
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
        this.sendResponse(res, notVeganResult, veganResult, unknownResult);
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
    // Decode URI component to handle %20 and other encoded characters
    const decoded = decodeURIComponent(ingredientsString);

    // Split by comma, trim whitespace, and filter out empty strings
    return decoded
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item !== "");
  }

  private sendResponse(
    res: Response,
    notVeganItems: string[],
    veganItems: string[],
    unknownItems: string[]
  ) {
    const responseData: ResponseData = {
      vegan: notVeganItems.length === 0,
      surely_vegan: veganItems,
      not_vegan: notVeganItems,
      maybe_vegan: unknownItems,
    };

    res.status(HttpStatus.OK).send({
      code: "OK",
      status: "200",
      message: "Success",
      data: responseData,
    });
  }
}

interface ResponseData {
  vegan: boolean;
  surely_vegan: string[];
  not_vegan: string[];
  maybe_vegan: string[];
}
