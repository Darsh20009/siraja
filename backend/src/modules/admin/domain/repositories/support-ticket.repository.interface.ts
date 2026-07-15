import { SupportTicket } from '@database/mongoose/schemas';
import { TicketStatus, TicketPriority } from '@shared/enums/support.enum';

export const SUPPORT_TICKET_REPOSITORY = 'SUPPORT_TICKET_REPOSITORY';

export interface ISupportTicketRepository {
  findAll(filter?: { status?: TicketStatus; priority?: TicketPriority; assignedTo?: string; tenantId?: string }): Promise<SupportTicket[]>;
  findById(id: string): Promise<SupportTicket | null>;
  findBySubmitter(userId: string): Promise<SupportTicket[]>;
  create(data: Partial<SupportTicket>): Promise<SupportTicket>;
  update(id: string, data: Partial<SupportTicket>): Promise<SupportTicket | null>;
  countByStatus(): Promise<Array<{ status: string; count: number }>>;
}
