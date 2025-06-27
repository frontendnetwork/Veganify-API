import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { createClient, RedisClientType } from "redis";

import { RedisConfigService } from "./redis.config";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: RedisClientType;

  constructor(private readonly redisConfigService: RedisConfigService) {}

  async onModuleInit() {
    try {
      const config = this.redisConfigService.getRedisConfig();

      const url = config.password
        ? `redis://:${config.password}@${config.host}:${config.port}/${
            config.db || 0
          }`
        : `redis://${config.host}:${config.port}/${config.db || 0}`;

      this.client = createClient({
        url,
        // Removed legacyMode for compatibility
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
        },
      });

      this.client.on("connect", () => {
        this.logger.log("Redis connected successfully");
      });

      this.client.on("error", (error: Error) => {
        const config = this.redisConfigService.getRedisConfig();
        this.logger.error(
          `Redis connection error for ${config.host}:${config.port}:`,
          error
        );
      });

      this.client.on("ready", () => {
        this.logger.log("Redis is ready to accept commands");
      });

      await this.client.connect();

      // Test the connection
      await this.client.ping();
      this.logger.log("Redis ping successful");
    } catch (error) {
      this.logger.error("Failed to initialize Redis connection:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.logger.log("Redis connection closed");
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error("Redis client not initialized");
    }
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<string | null> {
    const prefixedKey = this.getPrefixedKey(key);
    if (ttl) {
      return this.client.setEx(prefixedKey, ttl, value);
    }
    return this.client.set(prefixedKey, value);
  }

  async get(key: string): Promise<string | null> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.get(prefixedKey);
  }

  async del(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.del(prefixedKey);
  }

  async exists(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.exists(prefixedKey);
  }

  async setex(
    key: string,
    seconds: number,
    value: string
  ): Promise<string | null> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.setEx(prefixedKey, seconds, value);
  }

  async incr(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.incr(prefixedKey);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const prefixedKey = this.getPrefixedKey(key);
    const result = await this.client.expire(prefixedKey, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.ttl(prefixedKey);
  }

  async setNxPx(
    key: string,
    value: string,
    ttlMs: number
  ): Promise<string | null> {
    const prefixedKey = this.getPrefixedKey(key);
    return this.client.set(prefixedKey, value, {
      NX: true,
      PX: ttlMs,
    });
  }

  private getPrefixedKey(key: string): string {
    const prefix = this.redisConfigService.getCacheKeyPrefix();
    return `${prefix}${key}`;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      this.logger.error("Redis health check failed:", error);
      return false;
    }
  }
}
