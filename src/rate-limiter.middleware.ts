import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly limiter = rateLimit({
    max: 350,
    message:
      '{status: "429", code: "Rate limit reached. Try again in 1 minute."}',
    windowMs: 60 * 1000,
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}
