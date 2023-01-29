module.exports = function (app) {
  const express = require("express");
  const fs = require("fs");
  const _ = require("lodash");

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

      fs.readFile("./isvegan.json", "utf-8", (err, data) => {
        if (err) throw err;
        const isvegan = JSON.parse(data);
        const response = ingredients.split(",");

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
