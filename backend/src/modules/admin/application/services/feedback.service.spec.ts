import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeedbackService } from './feedback.service';
import { FEEDBACK_REPOSITORY } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

const mockRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  countByType: jest.fn(),
  countByStatus: jest.fn(),
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

    service  = module.get(FeedbackService);
    repo     = module.get(FEEDBACK_REPOSITORY);
    emitter  = module.get(EventEmitter2);
  });

  // ── submit ────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('creates feedback with PENDING status and isPublic: false by default', async () => {
      const created = { _id: 'fb1', type: FeedbackType.GENERAL, status: FeedbackStatus.PENDING };
      repo.create.mockResolvedValue(created);

      const result = await service.submit({ title: 'Test', body: 'Body' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: FeedbackStatus.PENDING, isPublic: false }),
      );
      expect(emitter.emit).toHaveBeenCalled();
      expect(result).toBe(created);
    });

    it('respects isPublic: true when provided', async () => {
      repo.create.mockResolvedValue({ _id: 'fb2', status: FeedbackStatus.PENDING });
      await service.submit({ title: 'Public feedback', body: 'Body', isPublic: true });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
    });

    it('marks anonymous when no userId provided', async () => {
      repo.create.mockResolvedValue({ _id: 'fb3' });
      await service.submit({ title: 'Anon', body: 'Body' });
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });
  });

  // ── changeStatus ──────────────────────────────────────────────────────────

  describe('changeStatus', () => {
    it('transitions PENDING → UNDER_REVIEW successfully', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.PENDING });
      repo.update.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.UNDER_REVIEW });

      const result = await service.changeStatus('fb1', FeedbackStatus.UNDER_REVIEW, 'admin-id');
      expect(repo.update).toHaveBeenCalledWith('fb1', expect.objectContaining({ status: FeedbackStatus.UNDER_REVIEW }));
      expect(result.status).toBe(FeedbackStatus.UNDER_REVIEW);
    });

    it('transitions UNDER_REVIEW → APPROVED', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.UNDER_REVIEW });
      repo.update.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.APPROVED });

      await service.changeStatus('fb1', FeedbackStatus.APPROVED, 'admin-id');
      expect(repo.update).toHaveBeenCalledWith('fb1', expect.objectContaining({ status: FeedbackStatus.APPROVED }));
    });

    it('transitions IN_PROGRESS → COMPLETED and sets resolvedAt', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.IN_PROGRESS });
      repo.update.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.COMPLETED });

      await service.changeStatus('fb1', FeedbackStatus.COMPLETED, 'admin-id');
      expect(repo.update).toHaveBeenCalledWith(
        'fb1',
        expect.objectContaining({ status: FeedbackStatus.COMPLETED, resolvedAt: expect.any(Date) }),
      );
    });

    it('throws BadRequestException for invalid transition (PENDING → COMPLETED)', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.PENDING });
      await expect(service.changeStatus('fb1', FeedbackStatus.COMPLETED, 'admin-id')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when already in terminal state (COMPLETED)', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1', status: FeedbackStatus.COMPLETED });
      await expect(service.changeStatus('fb1', FeedbackStatus.REJECTED, 'admin-id')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when feedback does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.changeStatus('nonexistent', FeedbackStatus.UNDER_REVIEW, 'admin-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── setVisibility ─────────────────────────────────────────────────────────

  describe('setVisibility', () => {
    it('updates isPublic flag', async () => {
      repo.findById.mockResolvedValue({ _id: 'fb1' });
      repo.update.mockResolvedValue({ _id: 'fb1', isPublic: true });

      await service.setVisibility('fb1', true);
      expect(repo.update).toHaveBeenCalledWith('fb1', { isPublic: true });
    });

    it('throws NotFoundException when feedback does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.setVisibility('nonexistent', true)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns byType, byStatus, and averageRating', async () => {
      repo.countByType.mockResolvedValue([{ type: 'general', count: 5 }]);
      repo.countByStatus.mockResolvedValue([{ status: 'pending', count: 3 }]);
      repo.averageRating.mockResolvedValue(4.2);

      const stats = await service.getStats();
      expect(stats.byType).toHaveLength(1);
      expect(stats.byStatus).toHaveLength(1);
      expect(stats.averageRating).toBe(4.2);
    });
  });
});
