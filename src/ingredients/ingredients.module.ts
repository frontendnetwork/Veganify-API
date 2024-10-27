import { Module } from "@nestjs/common";
import { IngredientsController } from "./v0/ingredients.controller";
import { IngredientsV1Controller } from "./v1/ingredients.controller";
import { TranslationService } from "./shared/services/translation.service";

@Module({
  controllers: [IngredientsController, IngredientsV1Controller],
  providers: [TranslationService],
})
export class IngredientsModule {}
