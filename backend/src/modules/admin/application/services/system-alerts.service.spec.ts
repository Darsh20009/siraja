import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SystemAlertsService } from './system-alerts.service';
import { SYSTEM_ALERT_REPOSITORY } from '../../domain/repositories/system-alert.repository.interface';
import { AlertSeverity, AlertStatus, AlertType } from '@shared/enums/admin-operations.enum';
import { EVENTS } from '@shared/events/events.constants';

const mockRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findActive: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

describe('SystemAlertsService', () => {
  let service: SystemAlertsService;
  let repo: ReturnType<typeof mockRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemAlertsService,
        { provide: SYSTEM_ALERT_REPOSITORY, useFactory: mockRepo },
        { provide: EventEmitter2, useFactory: mockEmitter },
      ],
    }).compile();

    service = module.get(SystemAlertsService);
    repo = module.get(SYSTEM_ALERT_REPOSITORY);
    emitter = module.get(EventEmitter2);
  });

  describe('fire', () => {
    it('creates alert with ACTIVE status and emits event', async () => {
      repo.create.mockResolvedValue({ _id: 'a1', type: AlertType.REDIS_FAILURE });

      await service.fire(AlertType.REDIS_FAILURE, AlertSeverity.CRITICAL, 'Redis unreachable');

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: AlertType.REDIS_FAILURE,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.SYSTEM_ALERT_FIRED, expect.objectContaining({
        type: AlertType.REDIS_FAILURE,
        severity: AlertSeverity.CRITICAL,
      }));
    });

    it('forwards metadata to the repository', async () => {
      repo.create.mockResolvedValue({ _id: 'a1' });

      await service.fire(
        AlertType.QUEUE_FAILURE,
        AlertSeverity.ERROR,
        'Queue stalled',
        { queueName: 'email' },
      );

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        metadata: { queueName: 'email' },
      }));
    });
  });

  describe('acknowledge', () => {
    it('throws NotFoundException when alert not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.acknowledge('x', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('updates status to ACKNOWLEDGED', async () => {
      repo.findById.mockResolvedValue({ _id: 'a1' });
      repo.update.mockResolvedValue({});

      await service.acknowledge('a1', 'admin1');

      expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'admin1',
      }));
    });
  });

  describe('resolve', () => {
    it('throws NotFoundException when alert not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.resolve('x', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('updates status to RESOLVED with resolution note', async () => {
      repo.findById.mockResolvedValue({ _id: 'a1' });
      repo.update.mockResolvedValue({});

      await service.resolve('a1', 'admin1', 'Redis restarted');

      expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({
        status: AlertStatus.RESOLVED,
        resolutionNote: 'Redis restarted',
      }));
    });
  });

  describe('runHealthChecks', () => {
    it('returns healthy true when no active alerts', async () => {
      repo.findActive.mockResolvedValue([]);

      const result = await service.runHealthChecks();

      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('includes count of active alerts in response', async () => {
      const activeAlerts = [
        { type: AlertType.REDIS_FAILURE, severity: AlertSeverity.CRITICAL, message: 'Redis down' },
      ];
      repo.findActive.mockResolvedValue(activeAlerts);

      const result = (await service.runHealthChecks()) as any;
      expect(result.activeAlertCount).toBe(1);
    });
  });
});
