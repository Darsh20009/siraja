import { Feedback } from '@database/mongoose/schemas';
import { FeedbackStatus, FeedbackType } from '@shared/enums/admin-operations.enum';

export const FEEDBACK_REPOSITORY = 'FEEDBACK_REPOSITORY';

export interface IFeedbackRepository {
  findAll(filter?: { type?: FeedbackType; status?: FeedbackStatus; tenantId?: string }): Promise<Feedback[]>;
  findById(id: string): Promise<Feedback | null>;
  create(data: Partial<Feedback>): Promise<Feedback>;
  update(id: string, data: Partial<Feedback>): Promise<Feedback | null>;
  countByType(): Promise<Array<{ type: string; count: number }>>;
  averageRating(): Promise<number>;
}
