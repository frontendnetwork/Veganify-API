import { Module } from "@nestjs/common";

import { RedisModule } from "../config/redis.module";

import { TranslationService } from "./shared/services/translation.service";
import { IngredientsController } from "./v0/ingredients.controller";
import { IngredientsV1Controller } from "./v1/ingredients.controller";

@Module({
  controllers: [IngredientsController, IngredientsV1Controller],
  imports: [RedisModule],
  providers: [TranslationService],
})
export class IngredientsModule {}
