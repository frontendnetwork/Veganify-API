import { Injectable, NestMiddleware } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: '{status: "429", code: "Rate limit reached"}',
  });

  use(req: any, res: any, next: () => void) {
    this.limiter(req, res, next);
  }
}
