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
        json: mock(),
        send: mock(),
        setHeader: mock(),
        status: mock().mockReturnThis(),
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
        json: mock(),
        send: mock(),
        setHeader: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      await controller.getOpenApi(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Error reading OpenAPI specification",
        status: 500,
      });
    });
  });

  describe("getSecurityTxt", () => {
    it("should serve security.txt with text/plain content-type", async () => {
      const mockContents = "Contact: security@example.com";
      spyOn(fsPromises, "readFile").mockResolvedValue(mockContents as never);

      const mockRes = {
        json: mock(),
        send: mock(),
        setHeader: mock(),
        status: mock().mockReturnThis(),
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
        json: mock(),
        send: mock(),
        setHeader: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      await controller.getSecurityTxt(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.send).toHaveBeenCalledWith("");
    });
  });

  describe("handlePostWildcard", () => {
    it("should return 404 for unknown POST endpoints", () => {
      const mockReq = {
        get: mock().mockReturnValue("localhost"),
        method: "POST",
        originalUrl: "/unknown",
        protocol: "http",
      } as unknown as Request;

      const mockRes = {
        json: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      controller.handlePostWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "Not found", status: 404 })
      );
    });
  });

  describe("handleGetWildcard", () => {
    it("should return 404 for unknown GET endpoints", () => {
      const mockReq = {
        get: mock().mockReturnValue("api.veganify.app"),
        method: "GET",
        originalUrl: "/nowhere",
        protocol: "https",
      } as unknown as Request;

      const mockRes = {
        json: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      controller.handleGetWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleMethodNotAllowed", () => {
    it("should return 405 for PUT/DELETE/PATCH requests", () => {
      const mockReq = {
        get: mock().mockReturnValue("api.veganify.app"),
        method: "PUT",
        originalUrl: "/v0/ingredients/water",
        protocol: "https",
      } as unknown as Request;

      const mockRes = {
        json: mock(),
        status: mock().mockReturnThis(),
      } as unknown as Response;

      controller.handleMethodNotAllowed(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "Method not allowed", status: 405 })
      );
    });
  });

  describe("handleOptions", () => {
    it("should return the available methods and paths", () => {
      const mockRes = {
        json: mock(),
        status: mock().mockReturnThis(),
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
