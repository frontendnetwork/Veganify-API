import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { writeFileSync } from "fs";
import { AppModule } from "./app.module";
import { Logger } from "nestjs-pino";
import * as yaml from "js-yaml";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(Logger);
  const options = new DocumentBuilder()
    .setTitle("VeganCheck API")
    .setDescription("API for checking if products and ingredients are vegan")
    .setVersion("0.3.1")
    .setContact(
      "FrontendNetwork",
      "https://vegancheck.me",
      "info@vegancheck.me"
    )
    .setExternalDoc(
      "VeganCheck.me API Documentation",
      "https://frontendnet.work/vegancheck-api"
    )
    .setLicense("MIT", "https://opensource.org/licenses/MIT")
    .addServer("https://api.vegancheck.me", "Production server")
    .addServer("https://api.staging.vegancheck.me", "Staging server")
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
