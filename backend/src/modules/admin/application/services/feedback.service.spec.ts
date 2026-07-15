import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeedbackService } from './feedback.service';
import { FEEDBACK_REPOSITORY } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';
import { EVENTS } from '@shared/events/events.constants';

const mockRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  countByType: jest.fn(),
  averageRating: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

describe('FeedbackService', () => {
  let service: FeedbackService;
  let repo: ReturnType<typeof mockRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: FEEDBACK_REPOSITORY, useFactory: mockRepo },
        { provide: EventEmitter2, useFactory: mockEmitter },
      ],
    }).compile();

    service = module.get(FeedbackService);
    repo = module.get(FEEDBACK_REPOSITORY);
    emitter = module.get(EventEmitter2);
  });

  describe('submit', () => {
    it('creates feedback with OPEN status and default type GENERAL', async () => {
      repo.create.mockResolvedValue({ _id: 'f1', type: FeedbackType.GENERAL });

      await service.submit({ title: 'Great app', body: 'Love it' });

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        type: FeedbackType.GENERAL,
        status: FeedbackStatus.OPEN,
      }));
    });

    it('sets isAnonymous true when no userId given', async () => {
      repo.create.mockResolvedValue({ _id: 'f1', type: FeedbackType.GENERAL });
      await service.submit({ title: 'test', body: 'body' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });

    it('emits FEEDBACK_SUBMITTED event', async () => {
      repo.create.mockResolvedValue({ _id: 'f1', type: FeedbackType.BUG_REPORT });
      await service.submit({ title: 'Bug', body: 'It crashes', type: FeedbackType.BUG_REPORT });
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.FEEDBACK_SUBMITTED, expect.objectContaining({
        type: FeedbackType.BUG_REPORT,
      }));
    });
  });

  describe('getFeedbackById', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getFeedbackById('x')).rejects.toThrow(NotFoundException);
    });

    it('returns feedback when found', async () => {
      const item = { _id: 'f1', title: 'test' };
      repo.findById.mockResolvedValue(item);
      const result = await service.getFeedbackById('f1');
      expect(result).toEqual(item);
    });
  });

  describe('resolve', () => {
    it('throws NotFoundException when not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.resolve('x', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('updates status to RESOLVED with admin notes', async () => {
      repo.findById.mockResolvedValue({ _id: 'f1' });
      repo.update.mockResolvedValue({});

      await service.resolve('f1', 'admin1', 'Fixed in v2');

      expect(repo.update).toHaveBeenCalledWith('f1', expect.objectContaining({
        status: FeedbackStatus.RESOLVED,
        adminNotes: 'Fixed in v2',
      }));
    });
  });

  describe('getStats', () => {
    it('rounds average rating to one decimal place', async () => {
      repo.countByType.mockResolvedValue([]);
      repo.averageRating.mockResolvedValue(4.166);

      const result = await service.getStats();
      expect(result.averageRating).toBe(4.2);
    });
  });
});
