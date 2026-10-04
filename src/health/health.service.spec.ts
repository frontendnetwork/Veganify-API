import { describe, expect, it, mock } from "bun:test";
import { ServiceUnavailableException } from "@nestjs/common";
import { HttpHealthIndicator } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";

import { RedisService } from "../config/redis.service";
import { HealthModule } from "./health.module";
import { HealthService, RedisHealthIndicator } from "./health.service";

async function createHealthModule(redisHealthy: boolean) {
  const redis = { isHealthy: mock(async () => redisHealthy) };
  const http = {
    pingCheck: mock(async () => ({ Ping: { status: "up" as const } })),
  };
  const testingModule = await Test.createTestingModule({
    imports: [HealthModule],
  })
    .overrideProvider(RedisService)
    .useValue(redis)
    .overrideProvider(HttpHealthIndicator)
    .useValue(http)
    .compile();

  return { testingModule, redis, http };
}

describe("HealthModule", () => {
  it("resolves health services through Nest dependency injection", async () => {
    const { testingModule } = await createHealthModule(true);
    try {
      expect(testingModule.get(HealthService)).toBeInstanceOf(HealthService);
      expect(testingModule.get(RedisHealthIndicator)).toBeInstanceOf(
        RedisHealthIndicator
      );
    } finally {
      await testingModule.close();
    }
  });

  it("reports a healthy Redis connection as up", async () => {
    const { testingModule, redis } = await createHealthModule(true);
    try {
      const indicator = testingModule.get(RedisHealthIndicator);
      expect(await indicator.isHealthy("redis")).toEqual({
        redis: { status: "up" },
      });
      expect(redis.isHealthy).toHaveBeenCalledTimes(1);
    } finally {
      await testingModule.close();
    }
  });

  it("reports an unhealthy Redis connection as down without throwing", async () => {
    const { testingModule } = await createHealthModule(false);
    try {
      const indicator = testingModule.get(RedisHealthIndicator);
      expect(await indicator.isHealthy("redis")).toEqual({
        redis: { status: "down" },
      });
    } finally {
      await testingModule.close();
    }
  });

  it("preserves the successful health response and HTTP check", async () => {
    const { testingModule, http } = await createHealthModule(true);
    try {
      const result = await testingModule.get(HealthService).check();
      expect(result).toMatchObject({
        status: "ok",
        info: { Ping: { status: "up" }, redis: { status: "up" } },
        error: {},
      });
      expect(http.pingCheck).toHaveBeenCalledWith("Ping", "https://8.8.8.8");
    } finally {
      await testingModule.close();
    }
  });

  it("preserves HTTP 503 when Redis is unhealthy", async () => {
    const { testingModule } = await createHealthModule(false);
    try {
      const result: unknown = await testingModule
        .get(HealthService)
        .check()
        .catch((error: unknown) => error);
      expect(result).toBeInstanceOf(ServiceUnavailableException);
      if (!(result instanceof ServiceUnavailableException)) {
        throw new Error("Expected an unhealthy health check to reject");
      }
      expect(result.getStatus()).toBe(503);
      expect(result.getResponse()).toMatchObject({
        status: "error",
        error: { redis: { status: "down" } },
      });
    } finally {
      await testingModule.close();
    }
  });
});
