import { readFile } from "node:fs/promises";
import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Logger,
  Options,
  Patch,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { Request, Response } from "express";

@Controller()
@ApiExcludeController()
export class ErrorsController {
  private readonly logger = new Logger(ErrorsController.name);

  @Get([
    "/OpenAPI.yaml",
    "/OpenAPI.yml",
    "/openapi",
    "/spec",
    "/specification",
    "/v0/OpenAPI.yaml",
    "/v0/OpenAPI.yml",
    "/v0/openapi",
    "/v0/spec",
    "/v0/specification",
  ])
  async getOpenApi(@Res() res: Response): Promise<void> {
    try {
      const contents = await readFile("./OpenAPI.yaml", "utf8");
      res.setHeader("Content-Type", "text/yaml");
      res.send(contents);
    } catch (err) {
      this.logger.error("Error reading OpenAPI specification:", err);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ status: 500, error: "Error reading OpenAPI specification" });
    }
  }

  @Get("/.well-known/security.txt")
  async getSecurityTxt(@Res() res: Response): Promise<void> {
    try {
      const contents = await readFile("./.well-known/security.txt", "utf8");
      res.setHeader("Content-Type", "text/plain");
      res.send(contents);
    } catch (err) {
      this.logger.warn("security.txt not found or unreadable:", err);
      res.status(HttpStatus.NOT_FOUND).send("");
    }
  }

  @Post("*")
  handlePostWildcard(@Req() req: Request, @Res() res: Response): void {
    this.logger.log(`Posted to non existing endpoint: ${req.originalUrl}`);
    this.handleWildcard(
      req,
      res,
      404,
      "Not found",
      "Try v0/ingredients (GET) or v0/product"
    );
  }

  @Get("*")
  handleGetWildcard(@Req() req: Request, @Res() res: Response): void {
    this.logger.log(`Get to non existing endpoint: ${req.originalUrl}`);
    this.handleWildcard(
      req,
      res,
      404,
      "Not found",
      "Try v0/ingredients or v0/product (POST)"
    );
  }

  @Put("*")
  @Delete("*")
  @Patch("*")
  handleMethodNotAllowed(@Req() req: Request, @Res() res: Response): void {
    this.handleWildcard(req, res, 405, "Method not allowed", "");
  }

  @Options("*")
  handleOptions(@Res() res: Response): void {
    const result = {
      GET: {
        paths: ["/v0/ingredients/:ingredientslist", "v0/peta/crueltyfree"],
      },
      POST: { paths: "/v0/product/:barcode" },
    };
    res.status(200).json(result);
  }

  private handleWildcard(
    req: Request,
    res: Response,
    status: number,
    code: string,
    message: string
  ): void {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const result = {
      status,
      code,
      message,
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(status).json(result);
  }
}
