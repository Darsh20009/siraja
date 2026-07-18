import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { FEATURE_REQUEST_REPOSITORY, IFeatureRequestRepository } from '../../domain/repositories/feature-request.repository.interface';
import { FEATURE_VOTE_REPOSITORY, IFeatureVoteRepository } from '../../domain/repositories/feature-vote.repository.interface';
import { FEATURE_FOLLOW_REPOSITORY, IFeatureFollowRepository } from '../../domain/repositories/feature-follow.repository.interface';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';

@Injectable()
export class FeatureVotingService {
  private readonly logger = new Logger(FeatureVotingService.name);

  constructor(
    @Inject(FEATURE_REQUEST_REPOSITORY) private readonly featureRepo: IFeatureRequestRepository,
    @Inject(FEATURE_VOTE_REPOSITORY) private readonly voteRepo: IFeatureVoteRepository,
    @Inject(FEATURE_FOLLOW_REPOSITORY) private readonly followRepo: IFeatureFollowRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  listFeatureRequests(status?: FeatureRequestStatus) {
    return this.featureRepo.findAll(status ? { status } : undefined);
  }

  getTopVoted(limit = 20) {
    return this.featureRepo.findTopVoted(limit);
  }

  async getById(id: string) {
    const item = await this.featureRepo.findById(id);
    if (!item) throw new NotFoundException('Feature request not found');
    const [voteCount, followerCount] = await Promise.all([
      this.voteRepo.countByFeature(id),
      this.followRepo.countByFeature(id),
    ]);
    return { ...(item as any).toObject?.() ?? item, voteCount, followerCount };
  }

  async suggest(data: {
    title: string;
    description: string;
    submittedBy?: string;
    tenantId?: string;
    tags?: string[];
  }) {
    const request = await this.featureRepo.create({
      title: data.title,
      description: data.description,
      submittedBy: data.submittedBy as never,
      tenantId: data.tenantId,
      tags: data.tags ?? [],
      status: FeatureRequestStatus.PROPOSED,
      voteCount: 0,
    });
    this.emitter.emit(EVENTS.FEATURE_REQUEST_CREATED, { featureRequestId: (request as any)._id?.toString() });
    return request;
  }

  // ── Voting ────────────────────────────────────────────────────────────────

  async vote(featureRequestId: string, userId: string, tenantId?: string) {
    const feature = await this.featureRepo.findById(featureRequestId);
    if (!feature) throw new NotFoundException('Feature request not found');

    const alreadyVoted = await this.voteRepo.hasVoted(featureRequestId, userId);
    if (alreadyVoted) throw new ConflictException('You have already voted for this feature');

    await Promise.all([
      this.voteRepo.create({ featureRequestId: featureRequestId as never, userId: userId as never, tenantId }),
      this.featureRepo.incrementVotes(featureRequestId, 1),
    ]);

    return { voted: true, voteCount: feature.voteCount + 1 };
  }

  async unvote(featureRequestId: string, userId: string) {
    const hasVoted = await this.voteRepo.hasVoted(featureRequestId, userId);
    if (!hasVoted) throw new BadRequestException('You have not voted for this feature');

    await Promise.all([
      this.voteRepo.delete(featureRequestId, userId),
      this.featureRepo.incrementVotes(featureRequestId, -1),
    ]);

    return { voted: false };
  }

  // ── Following ─────────────────────────────────────────────────────────────

  async follow(featureRequestId: string, userId: string, tenantId?: string) {
    const feature = await this.featureRepo.findById(featureRequestId);
    if (!feature) throw new NotFoundException('Feature request not found');

    const alreadyFollowing = await this.followRepo.isFollowing(featureRequestId, userId);
    if (alreadyFollowing) throw new ConflictException('You are already following this feature request');

    await this.followRepo.create({
      featureRequestId: featureRequestId as never,
      userId: userId as never,
      tenantId,
    });

    const followerCount = await this.followRepo.countByFeature(featureRequestId);
    return { following: true, followerCount };
  }

  async unfollow(featureRequestId: string, userId: string) {
    const isFollowing = await this.followRepo.isFollowing(featureRequestId, userId);
    if (!isFollowing) throw new BadRequestException('You are not following this feature request');

    await this.followRepo.delete(featureRequestId, userId);
    const followerCount = await this.followRepo.countByFeature(featureRequestId);
    return { following: false, followerCount };
  }

  async getFollowStatus(featureRequestId: string, userId: string) {
    const [isFollowing, followerCount] = await Promise.all([
      this.followRepo.isFollowing(featureRequestId, userId),
      this.followRepo.countByFeature(featureRequestId),
    ]);
    return { following: isFollowing, followerCount };
  }

  // ── Admin actions ─────────────────────────────────────────────────────────

  async changeStatus(id: string, status: FeatureRequestStatus, reviewedBy: string, adminResponse?: string, rejectionReason?: string) {
    const feature = await this.featureRepo.findById(id);
    if (!feature) throw new NotFoundException('Feature request not found');

    if (status === FeatureRequestStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('A rejection reason is required');
    }

    const update: Record<string, unknown> = { status, reviewedBy, reviewedAt: new Date() };
    if (adminResponse) update.adminResponse = adminResponse;
    if (rejectionReason) update.rejectionReason = rejectionReason;
    if (status === FeatureRequestStatus.COMPLETED) update.completedAt = new Date();

    const updated = await this.featureRepo.update(id, update as never);
    this.emitter.emit(EVENTS.FEATURE_REQUEST_STATUS_CHANGED, { featureRequestId: id, status });
    return updated;
  }

  async setPriority(id: string, priority: FeatureRequestPriority) {
    const feature = await this.featureRepo.findById(id);
    if (!feature) throw new NotFoundException('Feature request not found');
    return this.featureRepo.update(id, { priority } as never);
  }

  /**
   * Merge sourceId into targetId — transfers all votes, then deletes the source record.
   * Followers of the source feature are NOT migrated (they may follow the target separately).
   */
  async mergeFeatures(sourceId: string, targetId: string, mergedBy: string) {
    const [source, target] = await Promise.all([
      this.featureRepo.findById(sourceId),
      this.featureRepo.findById(targetId),
    ]);
    if (!source) throw new NotFoundException(`Source feature request "${sourceId}" not found`);
    if (!target) throw new NotFoundException(`Target feature request "${targetId}" not found`);
    if (sourceId === targetId) throw new BadRequestException('Cannot merge a feature request into itself');

    this.logger.log(`Merging feature ${sourceId} (${source.voteCount} votes) into ${targetId} by ${mergedBy}`);
    await this.featureRepo.mergeInto(sourceId, targetId);

    this.emitter.emit(EVENTS.FEATURE_REQUEST_STATUS_CHANGED, { featureRequestId: sourceId, status: 'merged_into', targetId, mergedBy });
    return { merged: true, sourceId, targetId };
  }
}
