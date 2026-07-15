import { TicketMessage } from '@database/mongoose/schemas';

export const TICKET_MESSAGE_REPOSITORY = 'TICKET_MESSAGE_REPOSITORY';

export interface ITicketMessageRepository {
  findByTicket(ticketId: string): Promise<TicketMessage[]>;
  create(data: Partial<TicketMessage>): Promise<TicketMessage>;
}
