import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeatureVotingService } from './feature-voting.service';
import { FEATURE_REQUEST_REPOSITORY } from '../../domain/repositories/feature-request.repository.interface';
import { FEATURE_VOTE_REPOSITORY } from '../../domain/repositories/feature-vote.repository.interface';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';
import { EVENTS } from '@shared/events/events.constants';

const mockFeatureRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findTopVoted: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  incrementVotes: jest.fn(),
});

const mockVoteRepo = () => ({
  hasVoted: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

describe('FeatureVotingService', () => {
  let service: FeatureVotingService;
  let featureRepo: ReturnType<typeof mockFeatureRepo>;
  let voteRepo: ReturnType<typeof mockVoteRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureVotingService,
        { provide: FEATURE_REQUEST_REPOSITORY, useFactory: mockFeatureRepo },
        { provide: FEATURE_VOTE_REPOSITORY, useFactory: mockVoteRepo },
        { provide: EventEmitter2, useFactory: mockEmitter },
      ],
    }).compile();

    service = module.get(FeatureVotingService);
    featureRepo = module.get(FEATURE_REQUEST_REPOSITORY);
    voteRepo = module.get(FEATURE_VOTE_REPOSITORY);
    emitter = module.get(EventEmitter2);
  });

  describe('suggest', () => {
    it('creates feature request with PROPOSED status and emits event', async () => {
      featureRepo.create.mockResolvedValue({ _id: 'fr1', title: 'Dark mode' });

      await service.suggest({ title: 'Dark mode', description: 'Add dark mode' });

      expect(featureRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: FeatureRequestStatus.PROPOSED,
        voteCount: 0,
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.FEATURE_REQUEST_CREATED, expect.any(Object));
    });
  });

  describe('vote', () => {
    it('throws NotFoundException when feature not found', async () => {
      featureRepo.findById.mockResolvedValue(null);
      await expect(service.vote('fr1', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when user already voted', async () => {
      featureRepo.findById.mockResolvedValue({ _id: 'fr1', voteCount: 1 });
      voteRepo.hasVoted.mockResolvedValue(true);
      await expect(service.vote('fr1', 'user1')).rejects.toThrow(ConflictException);
    });

    it('creates vote record and increments voteCount', async () => {
      featureRepo.findById.mockResolvedValue({ _id: 'fr1', voteCount: 2 });
      voteRepo.hasVoted.mockResolvedValue(false);
      voteRepo.create.mockResolvedValue({});
      featureRepo.incrementVotes.mockResolvedValue(undefined);

      const result = await service.vote('fr1', 'user1');

      expect(voteRepo.create).toHaveBeenCalled();
      expect(featureRepo.incrementVotes).toHaveBeenCalledWith('fr1', 1);
      expect(result.voteCount).toBe(3);
    });
  });

  describe('unvote', () => {
    it('throws BadRequestException when user has not voted', async () => {
      voteRepo.hasVoted.mockResolvedValue(false);
      await expect(service.unvote('fr1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('deletes vote and decrements count', async () => {
      voteRepo.hasVoted.mockResolvedValue(true);
      voteRepo.delete.mockResolvedValue(undefined);
      featureRepo.incrementVotes.mockResolvedValue(undefined);

      const result = await service.unvote('fr1', 'user1');

      expect(voteRepo.delete).toHaveBeenCalledWith('fr1', 'user1');
      expect(featureRepo.incrementVotes).toHaveBeenCalledWith('fr1', -1);
      expect(result.voted).toBe(false);
    });
  });

  describe('changeStatus', () => {
    it('throws NotFoundException when feature not found', async () => {
      featureRepo.findById.mockResolvedValue(null);
      await expect(service.changeStatus('fr1', FeatureRequestStatus.ACCEPTED, 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when rejecting without reason', async () => {
      featureRepo.findById.mockResolvedValue({ _id: 'fr1' });
      await expect(
        service.changeStatus('fr1', FeatureRequestStatus.REJECTED, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets completedAt when status is COMPLETED', async () => {
      featureRepo.findById.mockResolvedValue({ _id: 'fr1' });
      featureRepo.update.mockResolvedValue({});

      await service.changeStatus('fr1', FeatureRequestStatus.COMPLETED, 'admin1');

      expect(featureRepo.update).toHaveBeenCalledWith('fr1', expect.objectContaining({
        status: FeatureRequestStatus.COMPLETED,
        completedAt: expect.any(Date),
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.FEATURE_REQUEST_STATUS_CHANGED, expect.any(Object));
    });
  });
});
