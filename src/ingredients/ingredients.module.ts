import { Module } from "@nestjs/common";

import { TranslationService } from "./shared/services/translation.service";
import { IngredientsController } from "./v0/ingredients.controller";
import { IngredientsV1Controller } from "./v1/ingredients.controller";

@Module({
  controllers: [IngredientsController, IngredientsV1Controller],
  providers: [TranslationService],
})
export class IngredientsModule {}
