export interface MessageItem {
  id: string;
  tenantId: string;
  threadId: string;
  senderId: string;
  body: string;
  readBy: Record<string, Date>;
  refType?: string;
  refId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageInput {
  tenantId: string;
  threadId: string;
  senderId: string;
  body: string;
  refType?: string;
  refId?: string;
}

export interface IMessageRepository {
  create(input: CreateMessageInput): Promise<MessageItem>;
  findById(tenantId: string, id: string): Promise<MessageItem | null>;
  findByThread(
    tenantId: string,
    threadId: string,
    page?: number,
    limit?: number,
  ): Promise<{ items: MessageItem[]; total: number }>;
  markReadForUser(tenantId: string, threadId: string, userId: string): Promise<void>;
}

export const MESSAGE_REPOSITORY = Symbol('MESSAGE_REPOSITORY');
