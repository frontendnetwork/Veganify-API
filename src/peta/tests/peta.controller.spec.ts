import { beforeEach, describe, expect, it, mock } from "bun:test";
import * as path from "node:path";
import { Test, TestingModule } from "@nestjs/testing";
import { Response } from "express";

import { PetaController } from "../peta.controller";

describe("PetaController", () => {
  let controller: PetaController;
  let res: Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PetaController],
    }).compile();

    controller = module.get<PetaController>(PetaController);
    res = {
      json: mock(),
      sendFile: mock(),
      status: mock().mockReturnThis(),
    } as unknown as Response;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPetaByType", () => {
    it("should return a bad request response when type is missing", () => {
      controller.getPetaByType("", res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: "Bad request",
        message: "Missing argument type",
        status: "400",
      });
    });

    it('should return the cruelty-free JSON file when type is "crueltyfree"', () => {
      controller.getPetaByType("crueltyfree", res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.sendFile).toHaveBeenCalledWith(
        path.join(__dirname, "../../../peta_cruelty_free.json"),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    });

    it('should return a not implemented response when type is "veganapproved"', () => {
      controller.getPetaByType("veganapproved", res);
      expect(res.status).toHaveBeenCalledWith(501);
      expect(res.json).toHaveBeenCalledWith({
        code: "Not implemented",
        message: "veganapproved was removed from the API",
        status: "501",
      });
    });

    it("should return a not found response when type is not recognized", () => {
      controller.getPetaByType("unknown", res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        code: "Type not found",
        message:
          "The given type was not found in the API. Please check the documentation for available types. Also check for typos.",
        status: "404",
      });
    });
  });

  describe("getPetaWithoutType", () => {
    it("should return a bad request response when type is missing", () => {
      controller.getPetaWithoutType(res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        code: "Bad request",
        message: "Missing argument type: /v0/peta/:type",
        status: "400",
      });
    });
  });
});
