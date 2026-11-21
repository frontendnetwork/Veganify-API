import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CacheService } from "./cache.service";
import { RedisConfigService } from "./redis.config";
import { RedisService } from "./redis.service";

@Module({
  exports: [RedisService, CacheService],
  imports: [ConfigModule],
  providers: [RedisConfigService, RedisService, CacheService],
})
export class RedisModule {}
