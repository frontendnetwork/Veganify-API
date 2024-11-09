import * as fs from "fs";

import { HttpException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { ErrorsController } from "./errors.controller";

jest.mock("fs", () => ({
  readFile: jest.fn(),
}));

describe("ErrorsController", () => {
  let controller: ErrorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ErrorsController],
    }).compile();

    controller = module.get<ErrorsController>(ErrorsController);
  });

  describe.skip("getOpenApi", () => {
    it("should return OpenAPI specification", () => {
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      const mockContents = "OpenAPI specification content";
      (fs.readFile as unknown as jest.Mock).mockImplementationOnce(
        (_, __, callback) => {
          callback(null, mockContents);
        }
      );

      controller.getOpenApi(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/yaml"
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockContents);
    });

    it.skip("should throw HttpException if error reading file", () => {
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      const mockError = new Error("Error reading file");
      (fs.readFile as unknown as jest.Mock).mockImplementationOnce(
        (_, __, callback) => {
          callback(mockError, null);
        }
      );

      expect(() => controller.getOpenApi(mockRes)).toThrow(HttpException);
    });
  });

  describe("getSecurityTxt", () => {
    it.skip("should return security.txt file", () => {
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      const mockContents = "security.txt content";
      (fs.readFile as unknown as jest.Mock).mockImplementationOnce(
        (_, __, callback) => {
          callback(null, mockContents);
        }
      );

      controller.getSecurityTxt(mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain"
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockContents);
    });
  });

  describe("handlePostWildcard", () => {
    it("should handle POST request to non-existing endpoint", () => {
      const mockReq = {
        originalUrl: "/non-existing-endpoint",
        method: "POST",
        protocol: "http",
        get: () => "example.com",
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      controller.handlePostWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 404,
        code: "Not found",
        message: "Try v0/ingredients (GET) or v0/product",
        debug: {
          method: "POST",
          uri: `http://example.com${mockReq.originalUrl}`,
        },
      });
    });
  });

  describe("handleGetWildcard", () => {
    it("should handle GET request to non-existing endpoint", () => {
      const mockReq = {
        originalUrl: "/non-existing-endpoint",
        method: "GET",
        protocol: "http",
        get: () => "example.com",
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      controller.handleGetWildcard(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 404,
        code: "Not found",
        message: "Try v0/ingredients or v0/product (POST)",
        debug: {
          method: "GET",
          uri: `http://example.com${mockReq.originalUrl}`,
        },
      });
    });
  });

  describe("handleMethodNotAllowed", () => {
    it("should handle disallowed HTTP methods", () => {
      const mockReq = {
        originalUrl: "/non-existing-endpoint",
        method: "PUT",
        protocol: "http",
        get: () => "example.com",
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      controller.handleMethodNotAllowed(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 405,
        code: "Method not allowed",
        message: "",
        debug: {
          method: "PUT",
          uri: `http://example.com${mockReq.originalUrl}`,
        },
      });
    });
  });

  describe("handleOptions", () => {
    it("should return allowed HTTP methods and paths", () => {
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      controller.handleOptions(mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        GET: {
          paths: ["/v0/ingredients/:ingredientslist", "v0/peta/crueltyfree"],
        },
        POST: { paths: "/v0/product/:barcode" },
      });
    });
  });
});
