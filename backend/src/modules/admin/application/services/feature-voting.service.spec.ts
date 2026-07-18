import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FeatureVotingService } from './feature-voting.service';
import { FEATURE_REQUEST_REPOSITORY } from '../../domain/repositories/feature-request.repository.interface';
import { FEATURE_VOTE_REPOSITORY } from '../../domain/repositories/feature-vote.repository.interface';
import { FEATURE_FOLLOW_REPOSITORY } from '../../domain/repositories/feature-follow.repository.interface';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';

const mockFeatureRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findTopVoted: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  incrementVotes: jest.fn(),
  mergeInto: jest.fn(),
  delete: jest.fn(),
});

const mockVoteRepo = () => ({
  hasVoted: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  findByFeature: jest.fn(),
  countByFeature: jest.fn(),
});

const mockFollowRepo = () => ({
  findByFeature: jest.fn(),
  isFollowing: jest.fn(),
  countByFeature: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

const buildFeature = (overrides: Record<string, unknown> = {}) => ({
  _id: 'fr1',
  title: 'Test Feature',
  description: 'Desc',
  status: FeatureRequestStatus.PROPOSED,
  voteCount: 5,
  toObject: () => ({ _id: 'fr1', voteCount: 5, ...overrides }),
  ...overrides,
});

describe('FeatureVotingService', () => {
  let service: FeatureVotingService;
  let featureRepo: ReturnType<typeof mockFeatureRepo>;
  let voteRepo: ReturnType<typeof mockVoteRepo>;
  let followRepo: ReturnType<typeof mockFollowRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureVotingService,
        { provide: FEATURE_REQUEST_REPOSITORY, useFactory: mockFeatureRepo },
        { provide: FEATURE_VOTE_REPOSITORY,    useFactory: mockVoteRepo },
        { provide: FEATURE_FOLLOW_REPOSITORY,  useFactory: mockFollowRepo },
        { provide: EventEmitter2,              useFactory: mockEmitter },
      ],
    }).compile();

    service    = module.get(FeatureVotingService);
    featureRepo = module.get(FEATURE_REQUEST_REPOSITORY);
    voteRepo   = module.get(FEATURE_VOTE_REPOSITORY);
    followRepo = module.get(FEATURE_FOLLOW_REPOSITORY);
    emitter    = module.get(EventEmitter2);
  });

  // ── voting ────────────────────────────────────────────────────────────────

  describe('vote', () => {
    it('creates a vote and increments counter', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature({ voteCount: 5 }));
      voteRepo.hasVoted.mockResolvedValue(false);
      voteRepo.create.mockResolvedValue({});
      featureRepo.incrementVotes.mockResolvedValue(undefined);

      const result = await service.vote('fr1', 'user1');
      expect(result).toEqual({ voted: true, voteCount: 6 });
    });

    it('throws ConflictException if already voted', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      voteRepo.hasVoted.mockResolvedValue(true);

      await expect(service.vote('fr1', 'user1')).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for missing feature', async () => {
      featureRepo.findById.mockResolvedValue(null);
      await expect(service.vote('fr1', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('unvote', () => {
    it('removes vote and decrements counter', async () => {
      voteRepo.hasVoted.mockResolvedValue(true);
      voteRepo.delete.mockResolvedValue(undefined);
      featureRepo.incrementVotes.mockResolvedValue(undefined);

      const result = await service.unvote('fr1', 'user1');
      expect(result).toEqual({ voted: false });
    });

    it('throws BadRequestException if not voted', async () => {
      voteRepo.hasVoted.mockResolvedValue(false);
      await expect(service.unvote('fr1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── following ─────────────────────────────────────────────────────────────

  describe('follow', () => {
    it('creates a follow record', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      followRepo.isFollowing.mockResolvedValue(false);
      followRepo.create.mockResolvedValue({});
      followRepo.countByFeature.mockResolvedValue(1);

      const result = await service.follow('fr1', 'user1');
      expect(result).toEqual({ following: true, followerCount: 1 });
    });

    it('throws ConflictException if already following', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      followRepo.isFollowing.mockResolvedValue(true);
      await expect(service.follow('fr1', 'user1')).rejects.toThrow(ConflictException);
    });
  });

  describe('unfollow', () => {
    it('removes follow record', async () => {
      followRepo.isFollowing.mockResolvedValue(true);
      followRepo.delete.mockResolvedValue(undefined);
      followRepo.countByFeature.mockResolvedValue(0);

      const result = await service.unfollow('fr1', 'user1');
      expect(result).toEqual({ following: false, followerCount: 0 });
    });

    it('throws BadRequestException if not following', async () => {
      followRepo.isFollowing.mockResolvedValue(false);
      await expect(service.unfollow('fr1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFollowStatus', () => {
    it('returns following status and follower count', async () => {
      followRepo.isFollowing.mockResolvedValue(true);
      followRepo.countByFeature.mockResolvedValue(3);

      const result = await service.getFollowStatus('fr1', 'user1');
      expect(result).toEqual({ following: true, followerCount: 3 });
    });
  });

  // ── admin: merge ──────────────────────────────────────────────────────────

  describe('mergeFeatures', () => {
    it('calls mergeInto and emits event', async () => {
      featureRepo.findById
        .mockResolvedValueOnce(buildFeature({ _id: 'source', voteCount: 3 }))
        .mockResolvedValueOnce(buildFeature({ _id: 'target', voteCount: 10 }));
      featureRepo.mergeInto.mockResolvedValue(undefined);

      const result = await service.mergeFeatures('source', 'target', 'admin1');
      expect(featureRepo.mergeInto).toHaveBeenCalledWith('source', 'target');
      expect(result).toEqual({ merged: true, sourceId: 'source', targetId: 'target' });
      expect(emitter.emit).toHaveBeenCalled();
    });

    it('throws BadRequestException when merging into itself', async () => {
      featureRepo.findById
        .mockResolvedValueOnce(buildFeature())
        .mockResolvedValueOnce(buildFeature());
      await expect(service.mergeFeatures('fr1', 'fr1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when source does not exist', async () => {
      featureRepo.findById.mockResolvedValueOnce(null);
      await expect(service.mergeFeatures('nonexistent', 'target', 'admin1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── admin: changeStatus ───────────────────────────────────────────────────

  describe('changeStatus', () => {
    it('requires rejectionReason when rejecting', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      await expect(
        service.changeStatus('fr1', FeatureRequestStatus.REJECTED, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets completedAt when status is COMPLETED', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      featureRepo.update.mockResolvedValue({ _id: 'fr1', status: FeatureRequestStatus.COMPLETED });

      await service.changeStatus('fr1', FeatureRequestStatus.COMPLETED, 'admin1');
      expect(featureRepo.update).toHaveBeenCalledWith(
        'fr1',
        expect.objectContaining({ completedAt: expect.any(Date) }),
      );
    });
  });

  // ── setPriority ───────────────────────────────────────────────────────────

  describe('setPriority', () => {
    it('updates priority', async () => {
      featureRepo.findById.mockResolvedValue(buildFeature());
      featureRepo.update.mockResolvedValue({ _id: 'fr1', priority: FeatureRequestPriority.HIGH });

      await service.setPriority('fr1', FeatureRequestPriority.HIGH);
      expect(featureRepo.update).toHaveBeenCalledWith('fr1', { priority: FeatureRequestPriority.HIGH });
    });
  });
});
