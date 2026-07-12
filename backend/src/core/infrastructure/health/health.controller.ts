import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@modules/auth/infrastructure/decorators/public.decorator';

/**
 * Platform-global liveness/readiness probe. No tenant header required
 * (never gated by `TenantMiddleware`/`TenantScopeGuard`) — used by
 * uptime monitors, load balancers, and Beta launch smoke checks. Reports
 * degraded (503) if MongoDB isn't connected, since nothing else in the
 * app can function without it.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startedAt = Date.now();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  check(@Res() res: Response) {
    // Mongoose ReadyState: 0 disconnected, 1 connected, 2 connecting, 3 disconnecting.
    const dbConnected = this.connection.readyState === 1;
    const body = {
      status: dbConnected ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
      dependencies: {
        mongodb: dbConnected ? 'connected' : 'disconnected',
      },
    };
    res.status(dbConnected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json(body);
  }
}
