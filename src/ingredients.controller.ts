import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import fs from "fs";
import _ from "lodash";
import translate from "deepl";
import { ConfigService } from "@nestjs/config";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

@Controller("v0/ingredients")
export class IngredientsController {
  constructor(private configService: ConfigService) {}

  @Get(":ingredients")
  async getIngredients(
    @Param("ingredients") ingredientsParam: string,
    @Res() res: Response
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

    let ingredients: string;
    if (ingredientsParam) {
      ingredients = decodeURI(ingredientsParam.toLowerCase()).replace(
        /\s/g,
        ""
      );

      /* Translate to english */
      translate({
        free_api: true,
        text: ingredients,
        target_lang: "EN",
        auth_key: `${process.env.DEEPL_AUTH as string}`,
      })
        .then((result: any) => {
          const targetlanguage =
            result.data.translations[0].detected_source_language;
          const translated = result.data.translations[0].text;
          fs.readFile(
            "./isvegan.json",
            "utf-8",
            (err: NodeJS.ErrnoException | null, data: string) => {
              if (err != null) throw err;
              const isvegan = JSON.parse(data);
              let response: string[];
              if (translated === "false") {
                response = ingredients.split(",");
              } else {
                response = translated.split(",");
              }

              let res2 = _.intersectionWith(isvegan, response, _.isEqual);
              if (res2.length === 0) {
                res2 = ["translate"];
              }

              /* Translate back to entered language */
              translate({
                free_api: true,
                text: res2.join(","),
                target_lang: targetlanguage,
                auth_key: `${process.env.DEEPL_AUTH as string}`,
              })
                .then((result: any) => {
                  if (res2[0] === "translate") {
                    res.status(200).send(
                      JSON.stringify({
                        code: "OK",
                        status: "200",
                        message: "Success",
                        data: {
                          vegan: "true",
                        },
                      })
                    );
                  } else {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const textValues = result.data.translations.map(
                      (translation: any) => translation.text
                    );
                    const flagged = result.data.translations[0].text.split(",");

                    res.status(200).send(
                      JSON.stringify({
                        code: "OK",
                        status: "200",
                        message: "Success",
                        data: {
                          vegan: "false",
                          flagged,
                        },
                      })
                    );
                  }
                })
                .catch((error: Error) => {
                  logger.error(error);
                  res.status(429).send(
                    JSON.stringify({
                      code: "Rate limit reached",
                      status: "429",
                    })
                  );
                });
            }
          );
        })
        .catch((error: Error) => {
          logger.error(error);
          fs.readFile(
            "./isvegan.json",
            "utf-8",
            (err: NodeJS.ErrnoException | null, data: string) => {
              if (err != null) throw err;
              const isvegan = JSON.parse(data);
              const response = ingredients.split(/,\s*/);
              const result = _.intersectionWith(isvegan, response, _.isEqual);
              if (result.length === 0) {
                res.status(200).send(
                  JSON.stringify({
                    code: "OK",
                    status: "200",
                    message: "Success",
                    data: {
                      vegan: "true",
                    },
                  })
                );
              } else {
                res.status(200).send(
                  JSON.stringify({
                    code: "OK",
                    status: "200",
                    message: "Success",
                    data: {
                      vegan: "false",
                      flagged: result,
                    },
                  })
                );
              }
            }
          );
        });
    } else {
      const result = {
        status: 400,
        code: "Bad request",
        tip: "Use ?ingredients= or send a body",
      };
      res.json(result);
    }
  }
}