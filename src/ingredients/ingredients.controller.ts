import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import _ from "lodash";
import { ApiResponse, ApiTags } from "@nestjs/swagger";
import { TranslationService } from "./translation.service";
import { ParseBooleanPipe } from "./parse-boolean.pipe";
import { readJsonFile } from "./jsonFileReader";

@Controller("v0/ingredients")
export class IngredientsController {
  constructor(private translationService: TranslationService) {}

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
    @Query("translate", ParseBooleanPipe) translateFlag: boolean = true
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

    let ingredients = decodeURI(ingredientsParam.toLowerCase()).replace(
      /\s/g,
      ""
    );
    let isVegan, targetLanguage;

    const shouldTranslate = translateFlag === true;

    try {
      isVegan = await readJsonFile("./isvegan.json");
      let response;

      if (shouldTranslate) {
        try {
          const translationResult = await this.translationService.translateText(
            ingredients,
            "EN",
            1500
          );
          targetLanguage =
            translationResult.data.translations[0].detected_source_language;
          const translated = translationResult.data.translations[0].text;

          response = translated.split(",");
        } catch (error) {
          if (error instanceof Error) {
            if (error.message === "Translate timed out") {
              res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
                code: "Service Unavailable",
                status: "503",
                message:
                  "Translation service is unavailable. Try again with disabled translation (Results might vary). Add flag ?translate=false to the request.",
              });
              return;
            } else {
              res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
                code: "Internal Server Error",
                status: "500",
                message: "An error occurred during the translation process",
              });
              return;
            }
          } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
              code: "Internal Server Error",
              status: "500",
              message: "An unknown error occurred while processing the request",
            });
            return;
          }
        }
      } else {
        response = ingredients.split(",");
      }

      let result = _.intersectionWith(isVegan, response, _.isEqual);

      if (shouldTranslate && targetLanguage !== "EN") {
        try {
          const backTranslationResult =
            await this.translationService.translateText(
              result.join(","),
              targetLanguage,
              1500
            );
          result = backTranslationResult.data.translations[0].text.split(",");

          this.sendResponse(res, result.length === 0, result);
        } catch (error) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
            code: "Internal Server Error",
            status: "500",
            message: "An error occurred during the back translation process",
          });
          return;
        }
      } else {
        this.sendResponse(res, result.length === 0, result);
      }
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        code: "Internal Server Error",
        status: "500",
        message: "An error occurred while processing the request",
      });
    }
  }

  private sendResponse(
    res: Response,
    isVegan: boolean,
    flaggedItems: string[] = []
  ) {
    const responseData: ResponseData = {
      vegan: isVegan,
    };

    if (!isVegan) {
      responseData.flagged = flaggedItems;
    }

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
  flagged?: string[];
}
