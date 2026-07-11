import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageThread, MessageThreadSchema, Message, MessageSchema } from '@database/mongoose/schemas';
import { MESSAGE_THREAD_REPOSITORY } from './domain/repositories/message-thread.repository.interface';
import { MESSAGE_REPOSITORY } from './domain/repositories/message.repository.interface';
import { MessageThreadRepository } from './infrastructure/repositories/message-thread.repository';
import { MessageRepository } from './infrastructure/repositories/message.repository';
import { MessagingController } from './infrastructure/controllers/messaging.controller';
import { CreateThreadUseCase } from './application/use-cases/create-thread.use-case';
import { SendMessageUseCase } from './application/use-cases/send-message.use-case';
import { ListThreadsUseCase } from './application/use-cases/list-threads.use-case';
import { ListMessagesUseCase } from './application/use-cases/list-messages.use-case';

/**
 * InAppMessagingModule — Phase 10.
 *
 * Supports four thread types:
 *   SHEIKH_STUDENT    Sheikh → one student
 *   SHEIKH_PARENT     Sheikh → student's parent
 *   ADMIN_USER        Tenant Admin → any user(s)
 *   SUPERVISOR_CIRCLE Supervisor → all circle members
 *
 * Each thread contains an ordered list of Messages. Unread counts are
 * tracked per-participant on the thread document for efficient badge
 * queries without scanning the messages collection.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageThread.name, schema: MessageThreadSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [MessagingController],
  providers: [
    { provide: MESSAGE_THREAD_REPOSITORY, useClass: MessageThreadRepository },
    { provide: MESSAGE_REPOSITORY, useClass: MessageRepository },
    CreateThreadUseCase,
    SendMessageUseCase,
    ListThreadsUseCase,
    ListMessagesUseCase,
  ],
  exports: [MESSAGE_THREAD_REPOSITORY, MESSAGE_REPOSITORY],
})
export class InAppMessagingModule {}
