import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthCheck } from "@nestjs/terminus";

import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get("/")
  @HealthCheck()
  check() {
    return this.healthService.check();
  }
}
