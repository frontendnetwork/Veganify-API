import { HttpModule } from "@nestjs/axios";
import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { LoggerModule } from "nestjs-pino";

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
import { RateLimiterMiddleware } from "./rate-limiter.middleware";

@Module({
  imports: [
    HealthModule,
    HttpModule,
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: "warn",
      },
    }),
    TerminusModule,
    IngredientsModule,
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
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes(
        GradesController,
        IngredientsController,
        IngredientsV1Controller,
        ProductController,
        PetaController,
        ErrorsController
      );
  }
}
