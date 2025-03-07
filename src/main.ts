import { writeFileSync } from "fs";

import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as yaml from "js-yaml";
import { Logger } from "nestjs-pino";

import { AppModule } from "./app.module";


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(Logger);
  const options = new DocumentBuilder()
    .setTitle("Veganify API")
    .setDescription("API for checking if products and ingredients are vegan")
    .setVersion("0.3.1")
    .setContact("FrontendNetwork", "https://veganify.app", "info@philip.media")
    .setExternalDoc(
      "Veganify API Documentation",
      "https://frontendnet.work/veganify-api"
    )
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addServer("https://api.veganify.app", "Production server")
    .addServer("https://api.staging.veganify.app", "Staging server")
    .build();

  const document = SwaggerModule.createDocument(app, options);

  const yamlDocument = yaml.dump(document);
  writeFileSync("./openapi.yaml", yamlDocument);
  SwaggerModule.setup("api-docs", app, document);
  const port = 8080;

  await app.listen(port);
  logger.warn(`Server started on port ${port}`);
}

bootstrap();
