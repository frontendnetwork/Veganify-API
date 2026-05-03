import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import * as fsPromises from "node:fs/promises";
import { Test, TestingModule } from "@nestjs/testing";
import type { Request, Response } from "express";

import { ErrorsController } from "./errors.controller";

describe("ErrorsController", () => {
  let controller: ErrorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorsController],
    }).compile();

    controller = module.get<ErrorsController>(ErrorsController);
  });

  describe("getOpenApi", () => {
    it("should serve the OpenAPI spec with text/yaml content-type", async () => {
      const mockContents = "openapi: 3.0.0\ninfo:\n  title: Test";
      spyOn(fsPromises, "readFile").mockResolvedValue(mockContents as never);

      const mockRes = {
        setHeader: mock(),
        send: mock(),
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getOpenApi(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/yaml"
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockContents);
    });

    it("should return 500 JSON when the file cannot be read", async () => {
      spyOn(fsPromises, "readFile").mockRejectedValue(
        new Error("ENOENT: no such file")
      );

      const mockRes = {
        setHeader: mock(),
        send: mock(),
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getOpenApi(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 500,
        error: "Error reading OpenAPI specification",
      });
    });
  });

  describe("getSecurityTxt", () => {
    it("should serve security.txt with text/plain content-type", async () => {
      const mockContents = "Contact: security@example.com";
      spyOn(fsPromises, "readFile").mockResolvedValue(mockContents as never);

      const mockRes = {
        setHeader: mock(),
        send: mock(),
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getSecurityTxt(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain"
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockContents);
    });

    it("should return 404 empty body when security.txt is missing", async () => {
      spyOn(fsPromises, "readFile").mockRejectedValue(
        new Error("ENOENT: no such file")
      );

      const mockRes = {
        setHeader: mock(),
        send: mock(),
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      await controller.getSecurityTxt(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith("");
    });
  });

  describe("handlePostWildcard", () => {
    it("should return 404 for unknown POST endpoints", () => {
      const mockReq = {
        originalUrl: "/unknown",
        protocol: "http",
        method: "POST",
        get: mock().mockReturnValue("localhost"),
      } as unknown as Request;

      const mockRes = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      controller.handlePostWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 404, code: "Not found" })
      );
    });
  });

  describe("handleGetWildcard", () => {
    it("should return 404 for unknown GET endpoints", () => {
      const mockReq = {
        originalUrl: "/nowhere",
        protocol: "https",
        method: "GET",
        get: mock().mockReturnValue("api.veganify.app"),
      } as unknown as Request;

      const mockRes = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      controller.handleGetWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleMethodNotAllowed", () => {
    it("should return 405 for PUT/DELETE/PATCH requests", () => {
      const mockReq = {
        originalUrl: "/v0/ingredients/water",
        protocol: "https",
        method: "PUT",
        get: mock().mockReturnValue("api.veganify.app"),
      } as unknown as Request;

      const mockRes = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      controller.handleMethodNotAllowed(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 405, code: "Method not allowed" })
      );
    });
  });

  describe("handleOptions", () => {
    it("should return the available methods and paths", () => {
      const mockRes = {
        status: mock().mockReturnThis(),
        json: mock(),
      } as unknown as Response;

      controller.handleOptions(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          GET: expect.any(Object),
          POST: expect.any(Object),
        })
      );
    });
  });
});
