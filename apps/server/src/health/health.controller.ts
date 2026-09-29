import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  public constructor(private readonly health: HealthService) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('deploy')
  async deploy(): Promise<{ status: 'ok' }> {
    try {
      await this.health.checkDeployment();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
  }
}

@Controller('api/health')
export class ReadinessController {
  public constructor(private readonly health: HealthService) {}

  @Get('ready')
  async ready(): Promise<{ status: 'ready' }> {
    if (!(await this.health.isReady())) {
      throw new ServiceUnavailableException({ status: 'standby' });
    }
    return { status: 'ready' };
  }
}
