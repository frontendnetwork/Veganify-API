import { type Request, type Response, type Application } from "express";
import request from "request";
import axios from "axios";
import ini from "ini";
import iconv from "iconv-lite";
import pino from "pino";
import dotenv from "dotenv";
dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

export default function (app: Application): void {
  app.post(
    ["/v0/product/:id", "/v0/product/"],
    (req: Request, res: Response) => {
      let barcode: string | undefined;

      if (req.params.id.length === 0) {
        barcode = req.body.barcode;
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      } else if (!req.body.barcode) {
        barcode = req.params.id;
      }
      if (req.params.id.length === 0 && req.body.barcode.length === 0) {
        res.status(400).json({
          status: "400",
          code: "Bad request",
          message: "Missing argument v0/product/:barcode",
        });
      } else if (isNaN(Number(barcode))) {
        res.status(400).json({
          status: "400",
          code: "Bad request",
          message: "Wrong argument v0/product/:barcode",
        });
      } else {
        let vegan = "n/a";
        let vegetarian = "n/a";
        let palmoil = "n/a";
        let nutriscore = "n/a";
        const processed = "false";
        let animaltestfree = "n/a";
        let grade = "n/a";
        let productname = "n/a";
        let baseuri = "n/a";
        let apiname = "n/a";
        let edituri = "n/a";
        let genericname = "n/a";
        let api = "https://world.openfoodfacts.org/api/v0/product/";

        if (barcode === null || barcode === "" || barcode == null) {
          const arr = { status: "400", code: "Empty barcode" };
          res.json(arr);
        } else {
          request.get(
            `https://grades.vegancheck.me/api/${barcode}.json`,
            (error, response, body) => {
              if (error !== null) {
                logger.warn(error);
              }
              if (body !== "404") {
                const gradesource = JSON.parse(body);
                grade = gradesource.grade;
                productname = gradesource.name;
              }
            }
          );
          request.get(
            `https://world.openfoodfacts.org/api/v0/product/${barcode}`,
            (error, response, body) => {
              if (error !== null) {
                logger.warn(error);
              }
              const product = JSON.parse(body);
              request.get(
                `https://world.openbeautyfacts.org/api/v0/product/${
                  barcode as string
                }`,
                (error, response, beautybody) => {
                  if (error !== null){
                    logger.warn(error);
                  }
                  const beautyproduct = JSON.parse(beautybody);
                  if (product.status === "0" && beautyproduct.status === "1") {
                    api = "https://world.openbeautyfacts.org/api/v0/product/";
                    baseuri = "https://world.openbeautyfacts.org";
                    edituri = `https://world.openbeautyfacts.org/cgi/product.pl?type=edit&code=${
                      barcode as string
                    }`;
                    apiname = "OpenBeautyFacts";
                  } else if (
                    product.status === "1" &&
                    beautyproduct.status === "0"
                  ) {
                    api = "https://world.openfoodfacts.org/api/v0/product/";
                    baseuri = "https://world.openfoodfacts.org";
                    edituri = `https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=${
                      barcode as string
                    }`;
                    apiname = "OpenFoodFacts";
                  } else {
                    api = "https://world.openfoodfacts.org/api/v0/product/";
                    baseuri = "https://world.openfoodfacts.org";
                    edituri = `https://world.openfoodfacts.org/cgi/product.pl?type=edit&code=${
                      barcode as string
                    }`;
                    apiname = "OpenFoodFacts";
                  }

                  request.get(api + barcode, (error, response, body) => {
                    if (error !== null){
                      logger.warn(error);
                    }
                    const product = JSON.parse(body);

                    if (
                      product.product != null ||
                      product.product !== undefined ||
                      product.status !== 0
                    ) {
                      const array = product?.product?.ingredients_analysis_tags;

                      if (
                        product.product?.product_name != null ||
                        product.product?.product_name !== undefined
                      ) {
                        productname = product.product?.product_name;
                      }
                      if (
                        product.product?.generic_name != null ||
                        product.product?.generic_name !== undefined
                      ) {
                        genericname = product.product?.generic_name;
                      }
                      if (
                        product?.status_verbose != null ||
                        product?.status_verbose !== undefined
                      ) {
                        response = product.status_verbose;
                      }
                      if (
                        product.product?.nutriscore_grade != null ||
                        product.product?.nutriscore_grade !== undefined
                      ) {
                        nutriscore = product.product?.nutriscore_grade;
                      }

                      if (apiname === "OpenBeautyFacts") {
                        if (Array.isArray(array)) {
                          if (
                            array.includes("en:vegan") ||
                            array.includes("de:vegan")
                          ) {
                            vegan = "true";
                          } else if (
                            array.includes("en:non-vegan") ||
                            array.includes("de:non-vegan")
                          ) {
                            vegan = "false";
                          } else {
                            vegan = "n/a";
                          }
                          if (
                            array.includes("en:vegetarian") ||
                            array.includes("de:vegetarian")
                          ) {
                            vegetarian = "true";
                          } else if (array.includes("en:non-vegetarian")) {
                            vegetarian = "false";
                          } else {
                            vegetarian = "n/a";
                          }
                          if (
                            array.includes("en:palm-oil-free") ||
                            array.includes("de:palmölfrei")
                          ) {
                            palmoil = "false";
                          } else if (
                            array.includes("en:palm-oil") ||
                            array.includes("de:palm-oil")
                          ) {
                            palmoil = "true";
                          } else {
                            palmoil = "n/a";
                          }
                        }
                        if (Array.isArray(product.product.labels_tags)) {
                          const labelsTags = product.product
                            .labels_tags as string[];
                          if (
                            labelsTags.includes("en:not-tested-on-animals") ||
                            labelsTags.includes("de:ohne-tierversuche") ||
                            labelsTags.includes("en:cruelty-free") ||
                            labelsTags.includes("fr:cruelty-free") ||
                            labelsTags.includes(
                              "en:cruelty-free-international"
                            ) ||
                            labelsTags.includes("en:vegan-society")
                          ) {
                            animaltestfree = "true";
                          }
                        }
                        if (product.product.brands) {
                          axios
                            .get(
                              "https://api.vegancheck.me/v0/peta/crueltyfree"
                            )
                            .then((response) => {
                              const peta = response.data;
                              const dnt = peta.PETA_DOES_NOT_TEST;
                              const tester = dnt.toString().toLowerCase();
                              if (
                                tester.includes(
                                  product.product.brands.toLowerCase()
                                )
                              ) {
                                animaltestfree = "true";
                                apiname =
                                  "OpenBeautyFacts, PETA Beauty without Bunnies";
                              }
                            })
                            .catch((error) => {
                              logger.error(error);
                            });
                        } else {
                          animaltestfree = "n/a";
                        }
                      } else {
                        if (array) {
                          if (
                            array.includes("en:vegan") ||
                            array.includes("de:vegan")
                          ) {
                            vegan = "true";
                          } else if (
                            array.includes("en:non-vegan") ||
                            array.includes("de:non-vegan")
                          ) {
                            vegan = "false";
                          } else {
                            vegan = "n/a";
                          }
                          if (
                            array.includes("en:vegetarian") ||
                            array.includes("de:vegetarian")
                          ) {
                            vegetarian = "true";
                          } else if (array.includes("en:non-vegetarian")) {
                            vegetarian = "false";
                          } else {
                            vegetarian = "n/a";
                          }
                          if (
                            array.includes("en:palm-oil-free") ||
                            array.includes("de:palmölfrei")
                          ) {
                            palmoil = "false";
                          } else if (
                            array.includes("en:palm-oil") ||
                            array.includes("de:palm-oil")
                          ) {
                            palmoil = "true";
                          } else {
                            palmoil = "n/a";
                          }
                        }
                      }

                      const result = {
                        status: 200,
                        product: {
                          productname,
                          genericname,
                          vegan,
                          vegetarian,
                          animaltestfree,
                          palmoil,
                          nutriscore,
                          grade,
                        },
                        sources: {
                          processed,
                          api: apiname,
                          baseuri,
                          edituri,
                        },
                      };
                      logger.info(result);
                      res.json(result);
                    } else {
                      axios
                        .get(
                          `https://opengtindb.org/?ean=${
                            barcode as string
                          }&cmd=query&queryid=${
                            process.env.USER_ID_OEANDB as string
                          }`
                        )
                        .then((oedb) => {
                          const array = ini.parse(oedb.data);
                          const status = array.error;
                          if (status === "0") {
                            const desc = iconv
                              .decode(Buffer.from(array.descr), "ISO-8859-1")
                              .toString();
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const decodeddesc = decodeURI(
                              desc.replace("\n", "")
                            );
                            apiname = "Open EAN Database";
                            baseuri = "https://opengtindb.org";
                            productname = iconv
                              .decode(
                                Buffer.from(
                                  array.name + " " + array.detailname
                                ),
                                "ISO-8859-1"
                              )
                              .toString();
                            const contents = array.contents;

                            if (
                              contents != null &&
                              contents >= "128" &&
                              contents < "256"
                            ) {
                              vegan = "false";
                              vegetarian = "true";
                            } else if (
                              (contents != null &&
                                contents >= "256" &&
                                contents < "384") ||
                              (contents >= "384" && contents < "512")
                            ) {
                              vegan = "true";
                              vegetarian = "true";
                            } else if (desc != null) {
                              // The commented block was using await, if you intend to use it, convert it to .then() as well

                              const result = {
                                status: 200,
                                product: {
                                  productname,
                                  vegan,
                                  vegetarian,
                                  animaltestfree: "n/a",
                                  palmoil: "n/a",
                                  nutriscore: "n/a",
                                  grade,
                                },
                                sources: {
                                  processed,
                                  api: apiname,
                                  baseuri,
                                },
                              };
                              logger.info(result);
                              res.json(result);
                            }
                          } else {
                            const error = {
                              status: 404,
                              error: "Product not found",
                            };
                            res.status(404).json(error);
                          }
                        })
                        .catch((error) => {
                          logger.error("Error occurred:", error);
                          const errorResponse = {
                            status: 500,
                            error: "Internal server error",
                          };
                          res.status(500).json(errorResponse);
                        });
                    }
                  });
                }
              );
            }
          );
        }
      }
    }
  );
}
