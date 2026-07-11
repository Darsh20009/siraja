import { ThreadType } from '@shared/enums/messaging.enum';

export interface MessageThreadItem {
  id: string;
  tenantId: string;
  type: ThreadType;
  createdById: string;
  participants: string[];
  circleId?: string;
  subject?: string;
  lastMessagePreview?: string;
  lastMessageAt?: Date;
  unreadCounts: Record<string, number>;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageThreadInput {
  tenantId: string;
  type: ThreadType;
  createdById: string;
  participants: string[];
  circleId?: string;
  subject?: string;
}

export interface MessageThreadListFilter {
  participantId?: string;
  type?: ThreadType;
  circleId?: string;
  isArchived?: boolean;
}

export interface IMessageThreadRepository {
  create(input: CreateMessageThreadInput): Promise<MessageThreadItem>;
  findById(tenantId: string, id: string): Promise<MessageThreadItem | null>;
  findAll(
    tenantId: string,
    filter: MessageThreadListFilter,
    page?: number,
    limit?: number,
  ): Promise<{ items: MessageThreadItem[]; total: number }>;
  updateLastMessage(tenantId: string, id: string, preview: string): Promise<void>;
  incrementUnread(tenantId: string, threadId: string, userIds: string[]): Promise<void>;
  clearUnread(tenantId: string, threadId: string, userId: string): Promise<void>;
  archive(tenantId: string, id: string): Promise<MessageThreadItem>;
}

export const MESSAGE_THREAD_REPOSITORY = Symbol('MESSAGE_THREAD_REPOSITORY');
