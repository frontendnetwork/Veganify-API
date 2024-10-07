import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 350,
    message:
      '{status: "429", code: "Rate limit reached. Try again in 1 minute."}',
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}
