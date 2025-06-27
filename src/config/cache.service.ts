import * as crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";

import { RedisService } from "./redis.service";

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cachedValue = await this.redisService.get(key);
      if (cachedValue) {
        return JSON.parse(cachedValue) as T;
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redisService.set(key, serializedValue, ttl);
      this.logger.debug(`Cached key ${key} with TTL ${ttl} seconds`);
    } catch (error) {
      this.logger.warn(`Failed to set cache key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(key);
      this.logger.debug(`Deleted cache key ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete cache key ${key}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cachedValue;
    }

    // Thundering herd protection: acquire a lock
    const lockKey = `lock:${key}`;
    const lockTtl = 5000; // 5 seconds
    const retryDelay = 100; // ms
    const maxRetries = 20; // 2 seconds max wait

    let haveLock = false;
    let retries = 0;

    while (!haveLock && retries < maxRetries) {
      // Try to set the lock (NX = only if not exists)
      const lock = await this.redisService.setNxPx(lockKey, "1", lockTtl);
      if (lock) {
        haveLock = true;
        break;
      }
      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      // Check if cache is now filled
      const value = await this.get<T>(key);
      if (value !== null) {
        this.logger.debug(`Cache filled by another request for key: ${key}`);
        return value;
      }
      retries++;
    }

    if (haveLock) {
      try {
        const value = await fetcher();
        await this.set(key, value, ttl);
        return value;
      } finally {
        // Release the lock
        await this.redisService.del(lockKey);
      }
    } else {
      // Last attempt to get from cache after waiting
      const value = await this.get<T>(key);
      if (value !== null) {
        this.logger.debug(`Cache filled after waiting for key: ${key}`);
        return value;
      }
      // As a fallback, fetch directly (should be rare)
      this.logger.warn(
        `Cache and lock timeout for key: ${key}, fetching directly`
      );
      const valueDirect = await fetcher();
      await this.set(key, valueDirect, ttl);
      return valueDirect;
    }
  }

  // Cache key generators
  generateProductKey(barcode: string): string {
    return `product:${barcode}`;
  }

  generateGradeKey(barcode: string): string {
    return `grade:${barcode}`;
  }

  generatePetaKey(): string {
    return "peta:cruelty-free";
  }

  generateOpenFoodFactsKey(barcode: string): string {
    return `openfoodfacts:${barcode}`;
  }

  generateOpenEANDBKey(ean: string): string {
    return `openeandb:${ean}`;
  }

  generateTranslationKey(text: string, targetLang: string): string {
    // Use SHA-256 for better collision resistance
    const textHash = crypto
      .createHash("sha256")
      .update(text)
      .digest("hex")
      .substring(0, 16);
    return `translation:${targetLang}:${textHash}`;
  }
}
