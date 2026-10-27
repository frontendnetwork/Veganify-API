import * as path from "node:path";
import { Controller, Get, HttpStatus, Param, Res } from "@nestjs/common";
import {
  ApiExcludeEndpoint,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";

export class petaType {
  @ApiProperty({
    description: "The type of PETA list",
    example: "crueltyfree",
  })
  type = "crueltyfree";
}

@Controller("v0/peta")
export class PetaController {
  @Get(":type")
  @ApiTags("Peta")
  @ApiProperty({
    description: "The type of the peta list",
    example: "crueltyfree",
    type: petaType,
  })
  @ApiResponse({
    description: "Request returned a positive result.",
    status: 200,
  })
  @ApiResponse({
    description: "Specified type is not available.",
    status: 404,
  })
  @ApiResponse({
    description: "Input Error / Bad Request.",
    status: 400,
  })
  @ApiResponse({
    description: "Internal Server Error.",
    status: 500,
  })
  getPetaByType(@Param("type") type: string, @Res() res: Response) {
    if (!type || type.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        code: "Bad request",
        message: "Missing argument type",
        status: "400",
      });
    }

    if (type === "crueltyfree") {
      return res
        .status(HttpStatus.OK)
        .sendFile(path.join(__dirname, "../../peta_cruelty_free.json"), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
        });
    }

    if (type === "veganapproved") {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        code: "Not implemented",
        message: "veganapproved was removed from the API",
        status: "501",
      });
    }

    return res.status(HttpStatus.NOT_FOUND).json({
      code: "Type not found",
      message:
        "The given type was not found in the API. Please check the documentation for available types. Also check for typos.",
      status: "404",
    });
  }

  @Get()
  @ApiExcludeEndpoint()
  getPetaWithoutType(@Res() res: Response) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      code: "Bad request",
      message: "Missing argument type: /v0/peta/:type",
      status: "400",
    });
  }
}
