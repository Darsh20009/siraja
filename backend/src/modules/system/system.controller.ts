import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { Response } from 'express';
import * as os from 'os';
import { Public } from '@modules/auth/infrastructure/decorators/public.decorator';
import { CacheService } from '@shared/redis/cache.service';
import { QueueService } from '@shared/queues/queue.service';

export interface HealthDetail {
  status: 'ok' | 'degraded' | 'unavailable';
  latencyMs?: number;
  message?: string;
}

export interface DetailedHealthReport {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  system: {
    memoryUsedMb: number;
    memoryTotalMb: number;
    memoryUsagePercent: number;
    cpuLoadAvg1m: number;
    cpuLoadAvg5m: number;
    nodeVersion: string;
    platform: string;
  };
  dependencies: {
    mongodb: HealthDetail;
    redis: HealthDetail;
    queues: HealthDetail & { stats?: { name: string; waiting: number; active: number; failed: number }[] };
    storage: HealthDetail;
    email: HealthDetail;
    ai: HealthDetail;
  };
}

/**
 * SystemController — detailed health and monitoring endpoints.
 *
 * GET /api/v1/system/health/detailed — comprehensive health report for
 * ops dashboards, load balancers, and alerting systems.
 *
 * Marked @Public — load balancers and monitoring tools need access without
 * bearer tokens. In production, access should be restricted at the network
 * layer (not exposed publicly).
 */
@ApiTags('system')
@Controller('system')
export class SystemController {
  private readonly startedAt = Date.now();

  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('health/detailed')
  @ApiOperation({ summary: 'Detailed system health report' })
  async detailedHealth(@Res() res: Response): Promise<void> {
    const [mongoHealth, redisHealth, queueHealth, storageHealth, emailHealth, aiHealth] =
      await Promise.all([
        this.checkMongo(),
        this.checkRedis(),
        this.checkQueues(),
        this.checkStorage(),
        this.checkEmail(),
        this.checkAi(),
      ]);

    const memUsage = process.memoryUsage();
    const totalMemMb = os.totalmem() / 1024 / 1024;
    const usedMemMb = (os.totalmem() - os.freemem()) / 1024 / 1024;
    const [load1, load5] = os.loadavg();

    const dependencies = {
      mongodb: mongoHealth,
      redis: redisHealth,
      queues: queueHealth,
      storage: storageHealth,
      email: emailHealth,
      ai: aiHealth,
    };

    const criticalDown =
      mongoHealth.status === 'unavailable';
    const anyDegraded = Object.values(dependencies).some(
      (d) => d.status === 'degraded',
    );

    const overallStatus = criticalDown ? 'down' : anyDegraded ? 'degraded' : 'ok';

    const report: DetailedHealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? '1.0.0',
      system: {
        memoryUsedMb: Math.round(usedMemMb),
        memoryTotalMb: Math.round(totalMemMb),
        memoryUsagePercent: Math.round((usedMemMb / totalMemMb) * 100),
        cpuLoadAvg1m: parseFloat(load1.toFixed(2)),
        cpuLoadAvg5m: parseFloat(load5.toFixed(2)),
        nodeVersion: process.version,
        platform: os.platform(),
      },
      dependencies,
    };

    const httpStatus =
      overallStatus === 'down'
        ? HttpStatus.SERVICE_UNAVAILABLE
        : overallStatus === 'degraded'
          ? HttpStatus.OK // degraded still responds — let monitoring decide
          : HttpStatus.OK;

    res.status(httpStatus).json(report);
  }

  // ─── Individual checks ─────────────────────────────────────────────────

  private async checkMongo(): Promise<HealthDetail> {
    const t0 = Date.now();
    const state = this.connection.readyState;
    if (state !== 1) {
      return { status: 'unavailable', message: `readyState=${state}` };
    }
    try {
      await this.connection.db?.command({ ping: 1 });
      return { status: 'ok', latencyMs: Date.now() - t0 };
    } catch (err: unknown) {
      return { status: 'degraded', message: (err as Error).message };
    }
  }

  private async checkRedis(): Promise<HealthDetail> {
    const t0 = Date.now();
    const reachable = await this.cacheService.ping();
    if (!reachable) {
      return {
        status: this.cacheService.backend === 'redis' ? 'degraded' : 'unavailable',
        message: 'Redis not configured — using in-process fallback',
      };
    }
    return { status: 'ok', latencyMs: Date.now() - t0 };
  }

  private async checkQueues(): Promise<HealthDetail & { stats?: { name: string; waiting: number; active: number; failed: number }[] }> {
    const stats = await this.queueService.getStats();
    const available = stats.filter((s) => s.waiting !== -1);
    if (available.length === 0) {
      return { status: 'unavailable', message: 'Queues not configured (REDIS_URL missing)' };
    }
    const hasFailures = available.some((s) => s.failed > 100);
    return {
      status: hasFailures ? 'degraded' : 'ok',
      stats: available.map(({ name, waiting, active, failed }) => ({ name, waiting, active, failed })),
    };
  }

  private async checkStorage(): Promise<HealthDetail> {
    const driver = this.configService.get<string>('storage.driver', 'noop');
    if (driver === 'noop') {
      return { status: 'unavailable', message: 'Storage driver=noop (dev mode)' };
    }
    // We cannot do a real ping without a dedicated health key — just report configured
    return { status: 'ok', message: `driver=${driver}` };
  }

  private async checkEmail(): Promise<HealthDetail> {
    const host = this.configService.get<string>('email.host', '');
    if (!host) {
      return { status: 'unavailable', message: 'EMAIL_HOST not configured' };
    }
    return { status: 'ok', message: `host=${host}` };
  }

  private async checkAi(): Promise<HealthDetail> {
    const apiKey = this.configService.get<string>('moonshot.apiKey', '');
    if (!apiKey) {
      return { status: 'unavailable', message: 'MOONSHOT_API_KEY not configured' };
    }
    return { status: 'ok', message: 'moonshot configured' };
  }
}
