import * as crypto from "crypto";

import {
	Injectable,
	NestMiddleware,
	HttpException,
	HttpStatus,
	Logger,
	OnModuleInit,
	OnModuleDestroy,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { RedisService } from "./config/redis.service";

@Injectable()
export class RedisRateLimiterMiddleware
	implements NestMiddleware, OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(RedisRateLimiterMiddleware.name);
	private readonly maxRequests = 350;
	private readonly windowMs = 60 * 1000; // 60 seconds
	private readonly fallbackLimit = 50; // Stricter limit when Redis is down
	private inMemoryCounters = new Map<
		string,
		{ count: number; resetTime: number }
	>();
	private cleanupInterval?: NodeJS.Timeout;

	constructor(private readonly redisService: RedisService) {}

	onModuleInit() {
		// Schedule cleanup every 5 minutes
		this.cleanupInterval = setInterval(
			() => {
				this.cleanupInMemoryCounters();
			},
			5 * 60 * 1000,
		) as unknown as NodeJS.Timeout;
	}

	onModuleDestroy() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}

	async use(req: Request, res: Response, next: NextFunction) {
		try {
			const clientIp = this.extractClientIp(req);
			const rateLimitKey = `rate_limit:${clientIp}`;

			// Check Redis health before proceeding
			const redisHealthy = await this.redisService.isHealthy();

			if (!redisHealthy) {
				this.logger.warn(
					"Redis is not healthy, using in-memory fallback rate limiting",
				);
				return this.handleInMemoryRateLimit(req, res, next, clientIp);
			}

			// Use Redis atomic operations to prevent race conditions
			const now = Date.now();
			const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
			const windowKey = `${rateLimitKey}:${windowStart}`;

			// Atomic increment with expiration
			const currentCount = await this.redisService.incr(windowKey);

			// Set expiration only if this is the first request in the window
			if (currentCount === 1) {
				await this.redisService.expire(
					windowKey,
					Math.ceil(this.windowMs / 1000),
				);
			}

			// Check if limit exceeded
			if (currentCount > this.maxRequests) {
				const retryAfter = Math.ceil(
					(windowStart + this.windowMs - now) / 1000,
				);

				res.set({
					"Retry-After": String(retryAfter),
					"X-RateLimit-Limit": String(this.maxRequests),
					"X-RateLimit-Remaining": "0",
					"X-RateLimit-Reset": String(windowStart + this.windowMs),
				});

				throw new HttpException(
					{
						status: HttpStatus.TOO_MANY_REQUESTS,
						error: "Too Many Requests",
						message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
					},
					HttpStatus.TOO_MANY_REQUESTS,
				);
			}

			// Add rate limit headers
			res.set({
				"X-RateLimit-Limit": String(this.maxRequests),
				"X-RateLimit-Remaining": String(this.maxRequests - currentCount),
				"X-RateLimit-Reset": String(windowStart + this.windowMs),
			});

			next();
		} catch (error) {
			if (error instanceof HttpException) {
				throw error;
			}

			this.logger.error("Rate limiter error:", error);
			// On error, allow the request to proceed but log the issue
			next();
		}
	}

	private extractClientIp(req: Request): string {
		// Check for X-Forwarded-For header first (most reliable behind proxies)
		const forwardedFor = req.headers["x-forwarded-for"];
		if (forwardedFor) {
			// X-Forwarded-For can contain multiple IPs, take the first one
			const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
			const clientIp = ips.split(",")[0].trim();
			if (this.isValidIp(clientIp)) {
				return clientIp;
			}
		}

		// Check for X-Real-IP header
		const realIp = req.headers["x-real-ip"];
		if (realIp && this.isValidIp(realIp as string)) {
			return realIp as string;
		}

		// Fallback to req.ip (Express.js sets this from trusted proxy settings)
		if (req.ip && this.isValidIp(req.ip)) {
			return req.ip;
		}

		// Last resort fallback
		const remoteAddr =
			req.connection?.remoteAddress || req.socket?.remoteAddress;
		if (remoteAddr && this.isValidIp(remoteAddr)) {
			return remoteAddr;
		}

		// If no valid IP found, use a hash of user agent and other identifiers
		const identifier = `${req.headers["user-agent"] || ""}-${
			req.headers["accept-language"] || ""
		}`;
		return crypto
			.createHash("sha256")
			.update(identifier)
			.digest("hex")
			.substring(0, 16);
	}

	private isValidIp(ip: string): boolean {
		// Basic IP validation (IPv4 and IPv6)
		const ipv4Regex =
			/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
		const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
		return ipv4Regex.test(ip) || ipv6Regex.test(ip);
	}

	private async handleInMemoryRateLimit(
		req: Request,
		res: Response,
		next: NextFunction,
		clientIp: string,
	): Promise<void> {
		const now = Date.now();
		const windowStart = Math.floor(now / this.windowMs) * this.windowMs;

		// Get or create in-memory counter
		let counter = this.inMemoryCounters.get(clientIp);
		if (!counter || counter.resetTime <= now) {
			counter = { count: 0, resetTime: windowStart + this.windowMs };
			this.inMemoryCounters.set(clientIp, counter);
		}

		// Increment counter
		counter.count++;

		// Check if limit exceeded (using stricter fallback limit)
		if (counter.count > this.fallbackLimit) {
			const retryAfter = Math.ceil((counter.resetTime - now) / 1000);

			res.set({
				"Retry-After": String(retryAfter),
				"X-RateLimit-Limit": String(this.fallbackLimit),
				"X-RateLimit-Remaining": "0",
				"X-RateLimit-Reset": String(counter.resetTime),
				"X-RateLimit-Fallback": "true",
			});

			throw new HttpException(
				{
					status: HttpStatus.TOO_MANY_REQUESTS,
					error: "Too Many Requests",
					message: `Rate limit exceeded (fallback mode). Try again in ${retryAfter} seconds.`,
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		// Add rate limit headers
		res.set({
			"X-RateLimit-Limit": String(this.fallbackLimit),
			"X-RateLimit-Remaining": String(this.fallbackLimit - counter.count),
			"X-RateLimit-Reset": String(counter.resetTime),
			"X-RateLimit-Fallback": "true",
		});

		next();
	}

	// Clean up old in-memory entries periodically
	private cleanupInMemoryCounters(): void {
		const beforeCount = this.inMemoryCounters.size;
		const now = Date.now();

		for (const [key, counter] of this.inMemoryCounters.entries()) {
			if (counter.resetTime <= now) {
				this.inMemoryCounters.delete(key);
			}
		}

		const afterCount = this.inMemoryCounters.size;
		const cleanedCount = beforeCount - afterCount;

		if (cleanedCount > 0) {
			this.logger.debug(
				`Cleaned up ${cleanedCount} expired in-memory rate limit entries. Remaining: ${afterCount}`,
			);
		}
	}
}
