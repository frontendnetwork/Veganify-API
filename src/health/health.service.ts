import { Injectable } from "@nestjs/common";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";

import { RedisService } from "../config/redis.service";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.redisService.isHealthy();
    const result = this.getStatus(key, isHealthy);

    return result;
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
