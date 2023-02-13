module.exports = function (app) {
  const express = require("express");
  const fs = require("fs");
  const _ = require("lodash");
  const translate = require("deepl");
  require("dotenv").config();

  app.get("/v0/ingredients/:ingredients", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Charset", "utf-8");
    if (!req.params.ingredients) {
      res.status(400).json({
        status: "400",
        code: "Bad request",
        message: "Missing argument v0/ingredients/:ingredients",
      });
    } 

    let ingredients;
    if (req.params.ingredients != undefined && req.params.ingredients != "") {
      ingredients = unescape(req.params.ingredients.toLowerCase()).replace(
        /\s/g,
        ""
      );
    
      /* Translate to english */
      translate({
        free_api: true,
        text: ingredients,
        target_lang: 'EN',
        auth_key: `${process.env.DEEPL_AUTH}`,
      })
        .then(result => {
          targetlanguage = result.data.translations[0].detected_source_language;
          translated = result.data.translations[0].text;
        
          fs.readFile("./isvegan.json", "utf-8", (err, data) => {
            if (err) throw err;
            const isvegan = JSON.parse(data);
            console.log(translated);
            if (translated === "false"){
              var response = ingredients.split(",");
            }
            else {
              var response = translated.split(",");
            }

            var res2 = _.intersectionWith(isvegan, response, _.isEqual);
            if (res2.length === 0 || res2.length === 2) {
              res2 = "translate";
            }

            /* Translate back to entered language */
            translate({
              free_api: true,
              text: res2,
              target_lang: targetlanguage,
              auth_key: `${process.env.DEEPL_AUTH}`,
            })
            .then(result => {
                if (res2 === "translate") {
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
                  const textValues = result.data.translations.map(translation => translation.text);
                  res.status(200).send(
                    JSON.stringify({
                      code: "OK",
                      status: "200",
                      message: "Success",
                      data: {
                        vegan: "false",
                        flagged: textValues,
                      },
                    })
                  );
                }
            })
            .catch(error => {
              res.status(429).send(
                JSON.stringify({
                  code: "Rate limit reached",
                  status: "429"
                })
              );
            });
          });
        })
        .catch(error => {
          fs.readFile("./isvegan.json", "utf-8", (err, data) => {
            if (err) throw err;
            const isvegan = JSON.parse(data);
            var response = ingredients.split(",");
            
            var result = _.intersectionWith(isvegan, response, _.isEqual);
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
          });
        });
      } else {
        const result = {
          status: 400,
          code: "Bad request",
          tip: "Use ?ingredients= or send a body",
        };
        res.json(result);
      }
      });
      };
      
