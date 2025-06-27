import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { RedisModule } from "../config/redis.module";

import { HealthController } from "./health.controller";
import { HealthService, RedisHealthIndicator } from "./health.service";

@Module({
  imports: [TerminusModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService, RedisHealthIndicator],
  exports: [HealthService],
})
export class HealthModule {}
