import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- add this
import { ErrorsController } from "./errors.controller";
import { GradesService } from "./grades.service";
import { GradesController } from "./grades.controller";
import { IngredientsController } from "./ingredients.controller";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { PetaController } from "./peta.controller";

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot(), // <-- add this
  ],
  controllers: [
    GradesController,
    IngredientsController,
    ProductController,
    PetaController,
    ErrorsController,
  ],
  providers: [
    GradesService, 
    ProductService,
    ConfigService // <-- add this if it's a custom service you've created
  ],
})
export class AppModule {}
