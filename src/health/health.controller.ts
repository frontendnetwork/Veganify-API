import { Controller, Get } from "@nestjs/common";
import { HealthCheck } from "@nestjs/terminus";
import { HealthService } from "./health.service";
import { ApiTags } from "@nestjs/swagger";

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
