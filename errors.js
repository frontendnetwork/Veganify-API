module.exports = function (app) {
  app.post("*", (req, res) => {
    const result = {
      status: 404,
      code: "Not found",
      message: "Try v0/ingredients (GET) or v0/product",
    };
    res.status(404).json(result);
  });

  app.get("*", (req, res) => {
    const result = {
      status: 404,
      code: "Not found",
      message: "Try v0/ingredients or v0/product (POST)",
    };
    res.status(404).json(result);
  });

  app.put("*", (req, res) => {
    const result = {
      status: 405,
      code: "Method not allowed",
    };
    res.status(405).json(result);
  });

  app.delete("*", (req, res) => {
    const result = {
      status: 405,
      code: "Method not allowed",
    };
    res.status(405).json(result);
  });

  app.patch("*", (req, res) => {
    const result = {
      status: 405,
      code: "Method not allowed",
    };
    res.status(405).json(result);
  });

  app.put("*", (req, res) => {
    const result = {
      status: 405,
      code: "Method not allowed",
    };
    res.status(405).json(result);
  });

  app.propfind("*", (req, res) => {
    const result = {
      status: 405,
      code: "Method not allowed",
    };
    res.status(405).json(result);
  });

  app.options("*", (req, res) => {
    const result = {
      GET: { paths: "/v0/ingredients" },
      POST: { paths: "/v0/product" },
    };
    res.status(200).json(result);
  });
};
