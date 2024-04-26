import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ErrorsController } from "./errors.controller";
import { GradesService } from "./grades/grades.service";
import { GradesController } from "./grades/grades.controller";
import { IngredientsController } from "./ingredients/ingredients.controller";
import { TranslationService } from "./ingredients/translation.service";
import { ProductController } from "./product/product.controller";
import { ProductService } from "./product/product.service";
import { PetaController } from "./peta/peta.controller";
import { RateLimiterMiddleware } from "./rate-limiter.middleware";
import { LoggerModule } from "nestjs-pino";
import { HealthController } from "./health/health.controller";
import { TerminusModule } from "@nestjs/terminus";
import { HealthModule } from "./health/health.module";

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
  ],
  controllers: [
    GradesController,
    IngredientsController,
    ProductController,
    PetaController,
    HealthController,
    ErrorsController,
  ],
  providers: [GradesService, ProductService, ConfigService, TranslationService],
})
export class AppModule implements NestModule {
  constructor(private readonly configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes(
        GradesController,
        IngredientsController,
        ProductController,
        PetaController,
        ErrorsController
      );
  }
}
