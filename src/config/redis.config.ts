import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface RedisConfig {
  db?: number;
  host: string;
  lazyConnect?: boolean;
  maxRetriesPerRequest?: number;
  password?: string;
  port: number;
  retryDelayOnFailover?: number;
}

@Injectable()
export class RedisConfigService {
  constructor(private configService: ConfigService) {}

  getRedisConfig(): RedisConfig {
    return {
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
      password: this.configService.get<string>("REDIS_PASSWORD"),
      db: 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }

  getCacheKeyPrefix(): string {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    return `veganify:${nodeEnv}:`;
  }
}
