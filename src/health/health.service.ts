import { Injectable } from "@nestjs/common";
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
} from "@nestjs/terminus";

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator
  ) {}

  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck("DeepL", "https://deepl.com"),
      () => this.http.pingCheck("Ping", "https://8.8.8.8"),
    ]);
  }
}
