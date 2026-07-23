import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { FEEDBACK_REPOSITORY, IFeedbackRepository } from '../../domain/repositories/feedback.repository.interface';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

/** Statuses that constitute a "terminal" state — no further transitions allowed. */
const TERMINAL_STATUSES = new Set([FeedbackStatus.COMPLETED, FeedbackStatus.REJECTED, FeedbackStatus.CLOSED]);

/** Valid forward status transitions (admin-driven). */
const ALLOWED_TRANSITIONS: Partial<Record<FeedbackStatus, FeedbackStatus[]>> = {
  [FeedbackStatus.PENDING]:      [FeedbackStatus.UNDER_REVIEW, FeedbackStatus.REJECTED, FeedbackStatus.CLOSED],
  [FeedbackStatus.OPEN]:         [FeedbackStatus.UNDER_REVIEW, FeedbackStatus.REJECTED, FeedbackStatus.CLOSED],
  [FeedbackStatus.UNDER_REVIEW]: [FeedbackStatus.APPROVED, FeedbackStatus.REJECTED, FeedbackStatus.IN_PROGRESS],
  [FeedbackStatus.APPROVED]:     [FeedbackStatus.IN_PROGRESS, FeedbackStatus.COMPLETED],
  [FeedbackStatus.IN_PROGRESS]:  [FeedbackStatus.COMPLETED, FeedbackStatus.REJECTED],
  [FeedbackStatus.RESOLVED]:     [FeedbackStatus.CLOSED],
};

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY) private readonly repo: IFeedbackRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  listFeedback(filter?: { type?: FeedbackType; status?: FeedbackStatus; tenantId?: string; isPublic?: boolean }) {
    return this.repo.findAll(filter);
  }

  listPublic() {
    return this.repo.findAll({ isPublic: true });
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
    isPublic?: boolean;
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
      isPublic: data.isPublic ?? false,
      submitterName: data.submitterName,
      submitterEmail: data.submitterEmail,
      userId: data.userId as never,
      tenantId: data.tenantId,
      tags: data.tags ?? [],
      status: FeedbackStatus.PENDING,
    });

    this.emitter.emit(EVENTS.FEEDBACK_SUBMITTED, { feedbackId: String((feedback as unknown as { _id: Types.ObjectId })._id), type: feedback.type });
    return feedback;
  }

  async changeStatus(id: string, newStatus: FeedbackStatus, changedBy: string, adminNotes?: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Feedback not found');

    if (TERMINAL_STATUSES.has(item.status)) {
      throw new BadRequestException(`Cannot transition feedback from terminal status "${item.status}"`);
    }

    const allowed = ALLOWED_TRANSITIONS[item.status];
    if (allowed && !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid transition: "${item.status}" → "${newStatus}". Allowed: ${allowed.join(', ')}`,
      );
    }

    const update: Record<string, unknown> = { status: newStatus };
    if (adminNotes) update.adminNotes = adminNotes;
    if (newStatus === FeedbackStatus.COMPLETED || newStatus === FeedbackStatus.RESOLVED) {
      update.resolvedBy = changedBy;
      update.resolvedAt = new Date();
    }

    const updated = await this.repo.update(id, update as never);
    this.emitter.emit(EVENTS.FEEDBACK_SUBMITTED, { feedbackId: id, status: newStatus, changedBy });
    return updated;
  }

  /** @deprecated Use changeStatus instead. Kept for backward-compat. */
  async resolve(id: string, resolvedBy: string, adminNotes?: string) {
    return this.changeStatus(id, FeedbackStatus.COMPLETED, resolvedBy, adminNotes);
  }

  /** @deprecated Use changeStatus instead. */
  async close(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Feedback not found');
    return this.repo.update(id, { status: FeedbackStatus.CLOSED });
  }

  async setVisibility(id: string, isPublic: boolean) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Feedback not found');
    return this.repo.update(id, { isPublic } as never);
  }

  async getStats() {
    const [byType, byStatus, avgRating] = await Promise.all([
      this.repo.countByType(),
      this.repo.countByStatus(),
      this.repo.averageRating(),
    ]);
    return { byType, byStatus, averageRating: Math.round(avgRating * 10) / 10 };
  }
}
