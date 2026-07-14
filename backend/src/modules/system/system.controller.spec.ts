import { Test } from '@nestjs/testing';
import { SystemController } from './system.controller';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@shared/redis/cache.service';
import { QueueService } from '@shared/queues/queue.service';

const mockConnection = {
  readyState: 1,
  db: { command: jest.fn().mockResolvedValue({ ok: 1 }) },
};

const mockCacheService = {
  ping: jest.fn().mockResolvedValue(true),
  backend: 'redis',
};

const mockQueueService = {
  getStats: jest.fn().mockResolvedValue([
    { name: 'ai-queue', waiting: 0, active: 0, completed: 10, failed: 0, delayed: 0 },
    { name: 'email-queue', waiting: 2, active: 1, completed: 50, failed: 1, delayed: 0 },
  ]),
};

const mockConfigService = {
  get: jest.fn((key: string, fallback?: unknown) => {
    const values: Record<string, unknown> = {
      'storage.driver': 's3',
      'email.host': 'smtp.example.com',
      'moonshot.apiKey': 'test-key',
    };
    return values[key] ?? fallback;
  }),
};

function buildMockResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown, status, json };
}

describe('SystemController', () => {
  let controller: SystemController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: CacheService, useValue: mockCacheService },
        { provide: QueueService, useValue: mockQueueService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get(SystemController);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('detailedHealth returns 200 when all systems ok', async () => {
    const { res, status, json } = buildMockResponse();
    await controller.detailedHealth(res as never);
    expect(status).toHaveBeenCalledWith(200);
    const body = json.mock.calls[0][0];
    expect(body.status).toBe('ok');
    expect(body.dependencies.mongodb.status).toBe('ok');
    expect(body.dependencies.redis.status).toBe('ok');
    expect(body.system).toHaveProperty('memoryUsedMb');
    expect(body.system).toHaveProperty('cpuLoadAvg1m');
  });

  it('detailedHealth returns degraded when MongoDB disconnected', async () => {
    mockConnection.readyState = 0;
    const { res, status } = buildMockResponse();
    await controller.detailedHealth(res as never);
    expect(status).toHaveBeenCalledWith(503);
    mockConnection.readyState = 1; // restore
  });

  it('detailedHealth includes queue stats', async () => {
    const { res, status, json } = buildMockResponse();
    await controller.detailedHealth(res as never);
    expect(status).toHaveBeenCalledWith(200);
    const body = json.mock.calls[0][0];
    expect(body.dependencies.queues.stats).toBeDefined();
    expect(body.dependencies.queues.stats.length).toBeGreaterThan(0);
  });

  it('detailedHealth marks email unavailable when host not configured', async () => {
    mockConfigService.get.mockImplementation((key: string, fallback?: unknown) => {
      if (key === 'email.host') return '';
      const values: Record<string, unknown> = {
        'storage.driver': 's3',
        'moonshot.apiKey': 'test-key',
      };
      return values[key] ?? fallback;
    });
    const { res, json } = buildMockResponse();
    await controller.detailedHealth(res as never);
    const body = json.mock.calls[0][0];
    expect(body.dependencies.email.status).toBe('unavailable');
    // Restore
    mockConfigService.get.mockImplementation((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        'storage.driver': 's3',
        'email.host': 'smtp.example.com',
        'moonshot.apiKey': 'test-key',
      };
      return values[key] ?? fallback;
    });
  });
});
