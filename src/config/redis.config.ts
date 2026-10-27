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
      db: 0,
      host: this.configService.get<string>("REDIS_HOST", "localhost"),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      password: this.configService.get<string>("REDIS_PASSWORD"),
      port: this.configService.get<number>("REDIS_PORT", 6379),
      retryDelayOnFailover: 100,
    };
  }

  getCacheKeyPrefix(): string {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");
    return `veganify:${nodeEnv}:`;
  }
}
