import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { LoggerModule } from "nestjs-pino";

import { RedisModule } from "./config/redis.module";
import { ErrorsController } from "./errors.controller";
import { GradesController } from "./grades/grades.controller";
import { GradesService } from "./grades/grades.service";
import { HealthController } from "./health/health.controller";
import { HealthModule } from "./health/health.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { TranslationService } from "./ingredients/shared/services/translation.service";
import { IngredientsController } from "./ingredients/v0/ingredients.controller";
import { IngredientsV1Controller } from "./ingredients/v1/ingredients.controller";
import { PetaController } from "./peta/peta.controller";
import { ProductController } from "./product/product.controller";
import { ProductService } from "./product/product.service";
import { RedisRateLimiterMiddleware } from "./rate-limiter-redis.middleware";

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: "warn",
      },
    }),
    TerminusModule,
    IngredientsModule,
    RedisModule,
  ],
  controllers: [
    GradesController,
    ProductController,
    IngredientsController,
    IngredientsV1Controller,
    PetaController,
    HealthController,
    ErrorsController,
  ],
  providers: [GradesService, ProductService, TranslationService, ConfigService],
})
export class AppModule implements NestModule {
  constructor(readonly _configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RedisRateLimiterMiddleware).exclude("health").forRoutes("*");
  }
}
