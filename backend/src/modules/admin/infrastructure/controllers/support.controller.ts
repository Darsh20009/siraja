import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermissions } from '@common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@shared/authorization/permission-registry';
import { CurrentUser } from '@modules/auth/infrastructure/decorators/current-user.decorator';
import { AccessTokenPayload } from '@modules/auth/domain/value-objects/jwt-payload';
import { SupportService } from '../../application/services/support.service';
import { CreateTicketDto, AddTicketMessageDto, ResolveTicketDto, AssignTicketDto } from '../../application/dto/create-ticket.dto';
import { TicketStatus, TicketPriority } from '@shared/enums/support.enum';

@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  createTicket(@Body() dto: CreateTicketDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.createTicket({
      ...dto,
      submittedBy: user.sub,
      tenantId: user.tenantId,
    });
  }

  @Get('tickets/mine')
  getMyTickets(@CurrentUser() user: AccessTokenPayload) {
    return this.service.getMyTickets(user.sub);
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string, @CurrentUser() user: AccessTokenPayload) {
    return this.service.getTicketById(id, user.sub, false);
  }

  @Get('tickets/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.service.getMessages(id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  addMessage(
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.addMessage(id, user.sub, dto.body, false, dto.isInternal);
  }

  // ── Staff / Admin endpoints ───────────────────────────────────────────────

  @Get('admin/tickets')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.READ!)
  listAll(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('assignedTo') assignedTo?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.listTickets({ status, priority, assignedTo, tenantId });
  }

  @Get('admin/tickets/:id')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.READ!)
  adminGetTicket(@Param('id') id: string) {
    return this.service.getTicketById(id, undefined, true);
  }

  @Post('admin/tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.CREATE!)
  staffReply(
    @Param('id') id: string,
    @Body() dto: AddTicketMessageDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.service.addMessage(id, user.sub, dto.body, true, dto.isInternal);
  }

  @Patch('admin/tickets/:id/assign')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.ASSIGN!)
  assignTicket(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.service.assignTicket(id, dto.assignedTo);
  }

  @Patch('admin/tickets/:id/resolve')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.RESOLVE!)
  resolveTicket(@Param('id') id: string, @Body() dto: ResolveTicketDto, @CurrentUser() user: AccessTokenPayload) {
    return this.service.resolveTicket(id, user.sub, dto.resolutionNote);
  }

  @Patch('admin/tickets/:id/close')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.UPDATE!)
  closeTicket(@Param('id') id: string) {
    return this.service.closeTicket(id);
  }

  @Get('admin/stats')
  @RequirePermissions(PERMISSIONS.SUPPORT_ADMIN.READ!)
  getStats() {
    return this.service.getStats();
  }
}
