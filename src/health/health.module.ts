import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { RedisModule } from "../config/redis.module";

import { HealthController } from "./health.controller";
import { HealthService, RedisHealthIndicator } from "./health.service";

@Module({
  controllers: [HealthController],
  exports: [HealthService],
  imports: [TerminusModule, RedisModule],
  providers: [HealthService, RedisHealthIndicator],
})
export class HealthModule {}
