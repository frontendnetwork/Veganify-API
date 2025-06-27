import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheService } from "./cache.service";
import { RedisConfigService } from "./redis.config";
import { RedisService } from "./redis.service";

@Module({
  imports: [ConfigModule],
  providers: [RedisConfigService, RedisService, CacheService],
  exports: [RedisService, CacheService],
})
export class RedisModule {}
