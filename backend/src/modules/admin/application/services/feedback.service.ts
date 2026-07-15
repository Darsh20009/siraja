import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { FEEDBACK_REPOSITORY, IFeedbackRepository } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY) private readonly repo: IFeedbackRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  listFeedback(filter?: { type?: FeedbackType; status?: FeedbackStatus; tenantId?: string }) {
    return this.repo.findAll(filter);
  }

  async getFeedbackById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Feedback not found');
    return item;
  }

  async submit(data: {
    type?: FeedbackType;
    title: string;
    body: string;
    rating?: number;
    isAnonymous?: boolean;
    submitterName?: string;
    submitterEmail?: string;
    userId?: string;
    tenantId?: string;
    tags?: string[];
  }) {
    const feedback = await this.repo.create({
      type: data.type ?? FeedbackType.GENERAL,
      title: data.title,
      body: data.body,
      rating: data.rating,
      isAnonymous: data.isAnonymous ?? !data.userId,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      userId: data.userId as never,
      tenantId: data.tenantId,
      tags: data.tags ?? [],
      status: FeedbackStatus.OPEN,
    });

    this.emitter.emit(EVENTS.FEEDBACK_SUBMITTED, { feedbackId: feedback._id?.toString(), type: feedback.type });
    return feedback;
  }

  async resolve(id: string, resolvedBy: string, adminNotes?: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Feedback not found');
    return this.repo.update(id, {
      status: FeedbackStatus.RESOLVED,
      resolvedBy: resolvedBy as never,
      resolvedAt: new Date(),
      adminNotes,
    });
  }

  async close(id: string) {
    return this.repo.update(id, { status: FeedbackStatus.CLOSED });
  }

  async getStats() {
    const [byType, avgRating] = await Promise.all([
      this.repo.countByType(),
      this.repo.averageRating(),
    ]);
    return { byType, averageRating: Math.round(avgRating * 10) / 10 };
  }
}
