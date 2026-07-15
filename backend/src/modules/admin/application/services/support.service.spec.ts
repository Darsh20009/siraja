import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupportService } from './support.service';
import { SUPPORT_TICKET_REPOSITORY } from '../../domain/repositories/support-ticket.repository.interface';
import { TICKET_MESSAGE_REPOSITORY } from '../../domain/repositories/ticket-message.repository.interface';
import { TicketStatus, TicketStatusExtended, TicketCategory, TicketPriority } from '@shared/enums/support.enum';
import { EVENTS } from '@shared/events/events.constants';

const mockTicketRepo = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySubmitter: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  countByStatus: jest.fn(),
});

const mockMessageRepo = () => ({
  create: jest.fn(),
  findByTicket: jest.fn(),
});

const mockEmitter = () => ({ emit: jest.fn() });

describe('SupportService', () => {
  let service: SupportService;
  let ticketRepo: ReturnType<typeof mockTicketRepo>;
  let messageRepo: ReturnType<typeof mockMessageRepo>;
  let emitter: ReturnType<typeof mockEmitter>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: SUPPORT_TICKET_REPOSITORY, useFactory: mockTicketRepo },
        { provide: TICKET_MESSAGE_REPOSITORY, useFactory: mockMessageRepo },
        { provide: EventEmitter2, useFactory: mockEmitter },
      ],
    }).compile();

    service = module.get(SupportService);
    ticketRepo = module.get(SUPPORT_TICKET_REPOSITORY);
    messageRepo = module.get(TICKET_MESSAGE_REPOSITORY);
    emitter = module.get(EventEmitter2);
  });

  describe('createTicket', () => {
    it('creates ticket with OPEN status and emits event', async () => {
      ticketRepo.create.mockResolvedValue({ _id: 't1' });

      await service.createTicket({
        submittedBy: 'user1',
        subject: 'Help',
        body: 'I need help',
      });

      expect(ticketRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        status: TicketStatus.OPEN,
        category: TicketCategory.GENERAL,
        priority: TicketPriority.MEDIUM,
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.TICKET_CREATED, expect.any(Object));
    });
  });

  describe('getTicketById', () => {
    it('throws NotFoundException when ticket not found', async () => {
      ticketRepo.findById.mockResolvedValue(null);
      await expect(service.getTicketById('x', 'user1', false)).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-staff requests another user ticket', async () => {
      ticketRepo.findById.mockResolvedValue({
        submittedBy: { toString: () => 'other-user' },
      });
      await expect(service.getTicketById('t1', 'user1', false)).rejects.toThrow(ForbiddenException);
    });

    it('allows staff to access any ticket', async () => {
      const ticket = { submittedBy: { toString: () => 'other-user' } };
      ticketRepo.findById.mockResolvedValue(ticket);
      const result = await service.getTicketById('t1', 'admin1', true);
      expect(result).toEqual(ticket);
    });
  });

  describe('addMessage', () => {
    it('throws NotFoundException when ticket not found', async () => {
      ticketRepo.findById.mockResolvedValue(null);
      await expect(service.addMessage('x', 'u1', 'body', false)).rejects.toThrow(NotFoundException);
    });

    it('moves ticket back to IN_PROGRESS when customer replies on WAITING_CUSTOMER ticket', async () => {
      ticketRepo.findById.mockResolvedValue({ status: TicketStatusExtended.WAITING_CUSTOMER });
      messageRepo.create.mockResolvedValue({});
      ticketRepo.update.mockResolvedValue({});

      await service.addMessage('t1', 'user1', 'Still waiting', false);

      expect(ticketRepo.update).toHaveBeenCalledWith('t1', { status: TicketStatus.IN_PROGRESS });
    });

    it('moves ticket to WAITING_CUSTOMER when staff replies', async () => {
      ticketRepo.findById.mockResolvedValue({ status: TicketStatus.IN_PROGRESS });
      messageRepo.create.mockResolvedValue({});
      ticketRepo.update.mockResolvedValue({});

      await service.addMessage('t1', 'staff1', 'We are looking into it', true, false);

      expect(ticketRepo.update).toHaveBeenCalledWith('t1', { status: TicketStatusExtended.WAITING_CUSTOMER as never });
    });

    it('does not update status for internal staff notes', async () => {
      ticketRepo.findById.mockResolvedValue({ status: TicketStatus.IN_PROGRESS });
      messageRepo.create.mockResolvedValue({});

      await service.addMessage('t1', 'staff1', 'Internal note', true, true);

      expect(ticketRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('resolveTicket', () => {
    it('throws NotFoundException when ticket not found', async () => {
      ticketRepo.findById.mockResolvedValue(null);
      await expect(service.resolveTicket('x', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('sets RESOLVED status and emits event', async () => {
      ticketRepo.findById.mockResolvedValue({ _id: 't1' });
      ticketRepo.update.mockResolvedValue({});

      await service.resolveTicket('t1', 'admin1', 'Issue fixed');

      expect(ticketRepo.update).toHaveBeenCalledWith('t1', expect.objectContaining({
        status: TicketStatus.RESOLVED,
        resolvedBy: expect.anything(),
        resolutionNote: 'Issue fixed',
      }));
      expect(emitter.emit).toHaveBeenCalledWith(EVENTS.TICKET_RESOLVED, expect.any(Object));
    });
  });
});
