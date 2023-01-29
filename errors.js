module.exports = function (app) {
  /* OpenAPI.yml definition */
  app.get(["/OpenAPI.yaml", "/OpenAPI.yml", '/openapi', '/spec', '/specification', "/v0/OpenAPI.yaml", "/v0/OpenAPI.yml", '/v0/openapi', '/v0/spec', '/v0/specification'], (req, res) => {
    res.sendFile(__dirname + "/OpenAPI.yaml", {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
      },
    });
  });

  app.post("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 404,
      code: "Not found",
      message: "Try v0/ingredients (GET) or v0/product",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(404).json(result);
  });

  app.get("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 404,
      code: "Not found",
      message: "Try v0/ingredients or v0/product (POST)",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(404).json(result);
  });

  app.put("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 405,
      code: "Method not allowed",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(405).json(result);
  });

  app.delete("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 405,
      code: "Method not allowed",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(405).json(result);
  });

  app.patch("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 405,
      code: "Method not allowed",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(405).json(result);
  });

  app.put("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 405,
      code: "Method not allowed",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(405).json(result);
  });

  app.propfind("*", (req, res) => {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const result = {
      status: 405,
      code: "Method not allowed",
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(405).json(result);
  });

  app.options("*", (req, res) => {
    const result = {
      GET: { paths: ["/v0/ingredients/:ingredientslist", "v0/peta/crueltyfree"] },
      POST: { paths: "/v0/product/:barcode" },
    };
    res.status(200).json(result);
  });
};
