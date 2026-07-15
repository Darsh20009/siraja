import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '@shared/events/events.constants';
import { SUPPORT_TICKET_REPOSITORY, ISupportTicketRepository } from '../../domain/repositories/support-ticket.repository.interface';
import { TICKET_MESSAGE_REPOSITORY, ITicketMessageRepository } from '../../domain/repositories/ticket-message.repository.interface';
import { TicketStatus, TicketStatusExtended, TicketPriority, TicketCategory } from '@shared/enums/support.enum';

@Injectable()
export class SupportService {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly ticketRepo: ISupportTicketRepository,
    @Inject(TICKET_MESSAGE_REPOSITORY) private readonly messageRepo: ITicketMessageRepository,
    private readonly emitter: EventEmitter2,
  ) {}

  listTickets(filter?: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; tenantId?: string }) {
    return this.ticketRepo.findAll(filter);
  }

  getMyTickets(userId: string) {
    return this.ticketRepo.findBySubmitter(userId);
  }

  async getTicketById(id: string, userId?: string, isStaff = false) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isStaff && userId && ticket.submittedBy.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
    return ticket;
  }

  async createTicket(data: {
    submittedBy: string;
    tenantId?: string;
    subject: string;
    body: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    attachmentUrls?: string[];
  }) {
    const ticket = await this.ticketRepo.create({
      submittedBy: data.submittedBy as never,
      tenantId: data.tenantId as never,
      subject: data.subject,
      body: data.body,
      category: data.category ?? TicketCategory.GENERAL,
      priority: data.priority ?? TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      attachmentUrls: data.attachmentUrls ?? [],
    });
    this.emitter.emit(EVENTS.TICKET_CREATED, { ticketId: (ticket as any)._id?.toString(), submittedBy: data.submittedBy });
    return ticket;
  }

  async assignTicket(id: string, assignedTo: string) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.ticketRepo.update(id, {
      assignedTo: assignedTo as never,
      assignedAt: new Date(),
      status: TicketStatus.IN_PROGRESS,
    });
  }

  async addMessage(ticketId: string, sentBy: string, body: string, isStaffReply: boolean, isInternal = false) {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    const message = await this.messageRepo.create({
      ticketId: ticketId as never,
      sentBy: sentBy as never,
      body,
      isStaffReply,
      isInternal,
    });

    // If customer replies, move back to IN_PROGRESS
    if (!isStaffReply && (ticket.status as string) === TicketStatusExtended.WAITING_CUSTOMER) {
      await this.ticketRepo.update(ticketId, { status: TicketStatus.IN_PROGRESS });
    }
    if (isStaffReply && !isInternal) {
      await this.ticketRepo.update(ticketId, { status: TicketStatusExtended.WAITING_CUSTOMER as never });
    }

    return message;
  }

  getMessages(ticketId: string) {
    return this.messageRepo.findByTicket(ticketId);
  }

  async resolveTicket(id: string, resolvedBy: string, resolutionNote?: string) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    const updated = await this.ticketRepo.update(id, {
      status: TicketStatus.RESOLVED,
      resolvedBy: resolvedBy as never,
      resolvedAt: new Date(),
      resolutionNote,
    });
    this.emitter.emit(EVENTS.TICKET_RESOLVED, { ticketId: id, resolvedBy });
    return updated;
  }

  async closeTicket(id: string) {
    return this.ticketRepo.update(id, { status: TicketStatus.CLOSED, closedAt: new Date() });
  }

  async updatePriority(id: string, priority: TicketPriority) {
    return this.ticketRepo.update(id, { priority });
  }

  getStats() {
    return this.ticketRepo.countByStatus();
  }
}
