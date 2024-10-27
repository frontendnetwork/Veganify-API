import * as path from "path";

import { Controller, Get, Param, Res, HttpStatus } from "@nestjs/common";
import {
  ApiResponse,
  ApiTags,
  ApiProperty,
  ApiExcludeEndpoint,
} from "@nestjs/swagger";
import { Response } from "express";

export class petaType {
  @ApiProperty({
    description: "The type of PETA list",
    example: "crueltyfree",
  })
  type: string = "crueltyfree";
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
    status: 200,
    description: "Request returned a positive result.",
  })
  @ApiResponse({
    status: 404,
    description: "Specified tyoe is not available.",
  })
  @ApiResponse({
    status: 400,
    description: "Input Error / Bad Request.",
  })
  @ApiResponse({
    status: 500,
    description: "Internal Server Error.",
  })
  getPetaByType(@Param("type") type: string, @Res() res: Response) {
    if (!type || type.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: "400",
        code: "Bad request",
        message: "Missing argument type",
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
        status: "501",
        code: "Not implemented",
        message: "veganapproved was removed from the API",
      });
    }

    return res.status(HttpStatus.NOT_FOUND).json({
      status: "404",
      code: "Type not found",
      message:
        "The given type was not found in the API. Please check the documentation for available types. Also check for typos.",
    });
  }

  @Get()
  @ApiExcludeEndpoint()
  getPetaWithoutType(@Res() res: Response) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: "400",
      code: "Bad request",
      message: "Missing argument type: /v0/peta/:type",
    });
  }
}
