import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('db')
  async getDbStatus(): Promise<{ dbConnected: boolean }> {
    const dbConnected = await this.healthService.checkDb();
    return { dbConnected };
  }
}
