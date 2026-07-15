import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { FEATURE_REQUEST_REPOSITORY, IFeatureRequestRepository } from '../../domain/repositories/feature-request.repository.interface';
import { FEATURE_VOTE_REPOSITORY, IFeatureVoteRepository } from '../../domain/repositories/feature-vote.repository.interface';
import { FeatureRequestStatus, FeatureRequestPriority } from '@shared/enums/admin-operations.enum';

@Injectable()
export class FeatureVotingService {
  constructor(
    @Inject(FEATURE_REQUEST_REPOSITORY) private readonly featureRepo: IFeatureRequestRepository,
    @Inject(FEATURE_VOTE_REPOSITORY) private readonly voteRepo: IFeatureVoteRepository,
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
    return item;
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

  async changeStatus(id: string, status: FeatureRequestStatus, reviewedBy: string, adminResponse?: string, rejectionReason?: string) {
    const feature = await this.featureRepo.findById(id);
    if (!feature) throw new NotFoundException('Feature request not found');

    if (status === FeatureRequestStatus.REJECTED && !rejectionReason) {
      throw new BadRequestException('A rejection reason is required');
    }

    const update: Record<string, unknown> = {
      status,
      reviewedBy,
      reviewedAt: new Date(),
    };
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
}
