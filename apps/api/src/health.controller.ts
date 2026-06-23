import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { ImmichService } from './immich/immich.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly immich: ImmichService,
  ) {}

  @Get()
  async health() {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return {
      status: 'ok',
      db,
      immich: this.immich.isEnabled ? 'enabled' : 'disabled',
      ts: new Date().toISOString(),
    };
  }
}
