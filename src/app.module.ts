import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ErrorsController } from "./errors.controller";
import { GradesService } from "./grades.service";
import { GradesController } from "./grades.controller";
import { IngredientsController } from "./ingredients.controller";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { PetaController } from "./peta.controller";
import { RateLimiterMiddleware } from "./rate-limiter.middleware";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(),
    LoggerModule.forRoot({
      pinoHttp: {
        level: "warn",
      },
    }),
  ],
  controllers: [
    GradesController,
    IngredientsController,
    ProductController,
    PetaController,
    ErrorsController,
  ],
  providers: [GradesService, ProductService, ConfigService],
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
