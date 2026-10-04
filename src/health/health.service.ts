import { Injectable } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
  HealthIndicatorService,
  HttpHealthIndicator,
} from "@nestjs/terminus";

import { RedisService } from "../config/redis.service";

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly redisService: RedisService,
    private readonly healthIndicatorService: HealthIndicatorService
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const isHealthy = await this.redisService.isHealthy();

    return isHealthy ? indicator.up() : indicator.down();
  }
}

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private redisHealth: RedisHealthIndicator
  ) {}

  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck("Ping", "https://8.8.8.8"),
      () => this.redisHealth.isHealthy("redis"),
    ]);
  }
}
