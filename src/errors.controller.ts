/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";

import {
  Controller,
  Get,
  Post,
  Options,
  All,
  Res,
  Req,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

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
  getOpenApi(@Res() res: any): void {
    fs.readFile(
      "./OpenAPI.yaml",
      "utf8",
      (err: NodeJS.ErrnoException | null, contents: string) => {
        if (err != null) {
          this.logger.error("Error reading file:", err);
          throw new HttpException(
            "Error reading OpenAPI specification",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
        if (err) {
          this.logger.error("Error reading file:", err);
          throw new HttpException(
            "Error reading OpenAPI specification",
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }
        res.setHeader("Content-Type", "text/yaml");
        res.send(contents);
      }
    );
  }

  @Get("/.well-known/security.txt")
  getSecurityTxt(@Res() res: any): void {
    fs.readFile(
      "./.well-known/security.txt",
      "utf8",
      (err: NodeJS.ErrnoException | null, contents: string) => {
        if (err != null) {
          this.logger.warn(err);
        }
        res.setHeader("Content-Type", "text/plain");
        res.send(contents);
      }
    );
  }

  @Post("*")
  handlePostWildcard(@Req() req: any, @Res() res: any): void {
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
  handleGetWildcard(@Req() req: any, @Res() res: any): void {
    this.logger.log(`Get to non existing endpoint: ${req.originalUrl}`);
    this.handleWildcard(
      req,
      res,
      404,
      "Not found",
      "Try v0/ingredients or v0/product (POST)"
    );
  }

  @All(["PUT", "DELETE", "PATCH", "PROPFIND"])
  handleMethodNotAllowed(@Req() req: any, @Res() res: any): void {
    this.handleWildcard(req, res, 405, "Method not allowed", "");
  }

  @Options("*")
  handleOptions(@Res() res: any): void {
    const result = {
      GET: {
        paths: ["/v0/ingredients/:ingredientslist", "v0/peta/crueltyfree"],
      },
      POST: { paths: "/v0/product/:barcode" },
    };
    res.status(200).json(result);
  }

  private handleWildcard(
    req: any,
    res: any,
    status: number,
    code: string,
    message: string
  ): void {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    const result = {
      status: status,
      code: code,
      message: message,
      debug: {
        method: req.method,
        uri: fullUrl,
      },
    };
    res.status(status).json(result);
  }
}
