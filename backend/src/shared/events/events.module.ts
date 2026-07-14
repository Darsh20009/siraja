import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventDispatcherService } from './event-dispatcher.service';
import { EmailEventListener } from './listeners/email-event.listener';
import { NotificationEventListener } from './listeners/notification-event.listener';

/**
 * EventsModule — global event-driven architecture module.
 *
 * Registers EventEmitter2 (async, wildcard-enabled) and all domain event
 * listeners. Each listener reacts to a domain event and dispatches jobs
 * to the appropriate BullMQ queue via QueueService.
 *
 * Listeners are intentionally thin: they translate domain events into queue
 * job payloads. All heavy computation happens inside queue processors.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Wildcard support for future 'user.*' patterns
      wildcard: true,
      // Catch listener errors to prevent crashing the emitter
      ignoreErrors: false,
    }),
  ],
  providers: [
    EventDispatcherService,
    EmailEventListener,
    NotificationEventListener,
  ],
  exports: [EventDispatcherService],
})
export class EventsModule {}
