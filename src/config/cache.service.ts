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

    // Cache miss, fetch data
    this.logger.debug(`Cache miss for key: ${key}, fetching data...`);
    try {
      const freshValue = await fetcher();
      await this.set(key, freshValue, ttl);
      return freshValue;
    } catch (error) {
      this.logger.error(`Failed to fetch data for key ${key}:`, error);
      throw error;
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

  generateTranslationKey(text: string, targetLang: string): string {
    // Create a hash of the text to avoid very long keys
    const textHash = this.hashString(text);
    return `translation:${targetLang}:${textHash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
