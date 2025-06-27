import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { RedisService } from "./config/redis.service";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

@Injectable()
export class RedisRateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RedisRateLimiterMiddleware.name);
  private readonly maxRequests = 350;
  private readonly windowMs = 60 * 1000; // 60 seconds

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check Redis health before proceeding
      if (!(await this.redisService.isHealthy())) {
        this.logger.error("Redis is not healthy, bypassing rate limit check");
        return next();
      }

      const key = req.ip || req.connection.remoteAddress || "unknown";
      const rateLimitKey = `rate_limit:${key}`;

      // Get current rate limit info
      const currentInfo = await this.getRateLimitInfo(rateLimitKey);
      const now = Date.now();

      // Check if window has reset
      if (now > currentInfo.resetTime) {
        // Reset window
        await this.resetRateLimit(rateLimitKey);
        currentInfo.count = 0;
        currentInfo.resetTime = now + this.windowMs;
      }

      // Check if limit exceeded
      if (currentInfo.count >= this.maxRequests) {
        const retryAfter = Math.ceil((currentInfo.resetTime - now) / 1000);

        res.set({
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(this.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(currentInfo.resetTime),
        });

        throw new HttpException(
          {
            status: HttpStatus.TOO_MANY_REQUESTS,
            error: "Too Many Requests",
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Increment counter
      currentInfo.count++;
      await this.setRateLimitInfo(rateLimitKey, currentInfo);

      // Add rate limit headers
      res.set({
        "X-RateLimit-Limit": String(this.maxRequests),
        "X-RateLimit-Remaining": String(this.maxRequests - currentInfo.count),
        "X-RateLimit-Reset": String(currentInfo.resetTime),
      });

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error("Rate limiter error:", error);
      // On error, allow the request to proceed
      next();
    }
  }

  private async getRateLimitInfo(key: string): Promise<RateLimitInfo> {
    try {
      const data = await this.redisService.get(key);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      this.logger.warn(`Failed to get rate limit info for ${key}:`, error);
    }

    return {
      count: 0,
      resetTime: Date.now() + this.windowMs,
    };
  }

  private async setRateLimitInfo(
    key: string,
    info: RateLimitInfo
  ): Promise<void> {
    try {
      const ttl = Math.ceil((info.resetTime - Date.now()) / 1000);
      await this.redisService.set(key, JSON.stringify(info), ttl);
    } catch (error) {
      this.logger.warn(`Failed to set rate limit info for ${key}:`, error);
    }
  }

  private async resetRateLimit(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
    } catch (error) {
      this.logger.warn(`Failed to reset rate limit for ${key}:`, error);
    }
  }
}
