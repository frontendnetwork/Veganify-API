import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';

@Controller('v0/peta')
export class PetaController {
  
  @Get(':type')
  getPetaByType(@Param('type') type: string, @Res() res: Response) {
    if (!type || type.length === 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: '400',
        code: 'Bad request',
        message: 'Missing argument type'
      });
    }

    if (type === 'crueltyfree') {
      return res.status(HttpStatus.OK).sendFile(path.join(__dirname, '../peta_cruelty_free.json'), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }

    if (type === 'veganapproved') {
      return res.status(HttpStatus.NOT_IMPLEMENTED).json({
        status: '501',
        code: 'Not implemented',
        message: 'veganapproved was removed from the API'
      });
    }

    return res.status(HttpStatus.NOT_FOUND).json({
      status: '404',
      code: 'Type not found',
      message: 'The given type was not found in the API. Please check the documentation for available types. Also check for typos.'
    });
  }

  @Get()
  getPetaWithoutType(@Res() res: Response) {
    return res.status(HttpStatus.BAD_REQUEST).json({
      status: '400',
      code: 'Bad request',
      message: 'Missing argument type: /v0/peta/:type'
    });
  }
}
