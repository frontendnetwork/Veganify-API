import fs from 'fs'
import { type Application, type Request, type Response } from 'express'
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

export default function (app: Application): void {
  /* OpenAPI.yml definition */
  app.get(
    [
      '/OpenAPI.yaml',
      '/OpenAPI.yml',
      '/openapi',
      '/spec',
      '/specification',
      '/v0/OpenAPI.yaml',
      '/v0/OpenAPI.yml',
      '/v0/openapi',
      '/v0/spec',
      '/v0/specification'
    ],
    (req: Request, res: Response) => {
      fs.readFile('./OpenAPI.yaml',
        'utf8',
        (err: NodeJS.ErrnoException | null, contents: string) => {
          if (err != null) {
            logger.error('Error reading file:', err)
            res.status(500).send('Error reading OpenAPI specification')
            return
          }
          res.writeHead(200, { 'Content-Type': 'text/yaml' })
          res.write(contents)
          res.end()
        }
      )
    }
  )

  /* security.txt */
  app.get('/.well-known/security.txt', (req: Request, res: Response) => {
    fs.readFile('./.well-known/security.txt',
      'utf8',
      (err: NodeJS.ErrnoException | null, contents: string) => {
        logger.warn(err)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.write(contents)
        res.end()
      }
    )
  })

  app.post('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 404,
      code: 'Not found',
      message: 'Try v0/ingredients (GET) or v0/product',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(404).json(result)
  })

  app.get('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 404,
      code: 'Not found',
      message: 'Try v0/ingredients or v0/product (POST)',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(404).json(result)
  })

  app.put('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 405,
      code: 'Method not allowed',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(405).json(result)
  })

  app.delete('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 405,
      code: 'Method not allowed',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(405).json(result)
  })

  app.patch('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 405,
      code: 'Method not allowed',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(405).json(result)
  })

  app.put('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 405,
      code: 'Method not allowed',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(405).json(result)
  })

  app.propfind('*', (req: Request, res: Response) => {
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl
    const result = {
      status: 405,
      code: 'Method not allowed',
      debug: {
        method: req.method,
        uri: fullUrl
      }
    }
    res.status(405).json(result)
  })

  app.options('*', (req: Request, res: Response) => {
    const result = {
      GET: {
        paths: ['/v0/ingredients/:ingredientslist', 'v0/peta/crueltyfree']
      },
      POST: { paths: '/v0/product/:barcode' }
    }
    res.status(200).json(result)
  })
}
