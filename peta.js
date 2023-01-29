module.exports = function (app) {
  app.get("/v0/peta/:type", (req, res) => {
    if (!req.params.type) {
      res.status(400).json({
        status: "400",
        code: "Bad request",
        message: "Missing argument type",
      });
    } else if (req.params.type === "crueltyfree") {
      res.status(200).sendFile(__dirname + "/peta_cruelty_free.json", {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      });
    } else if (req.params.type === "veganapproved") {
      res.status(501).json({
        status: "501",
        code: "Not implemented",
        message: "veganapproved was removed from the API",
      });
    }
    else {
        res.status(404).json({
          status: "404",
          code: "Type not found",
          message: "The given type was not found in the API. Please check the documentation for available types. Also check for typos.",
        });
      }
  });
  app.get("/v0/peta/", (req, res) => {
      res.status(400).json({
        status: "400",
        code: "Bad request",
        message: "Missing argument type: /v0/peta/:type",
      });
  });
};