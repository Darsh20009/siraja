import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketCategory, TicketPriority } from '@shared/enums/support.enum';

export class CreateTicketDto {
  @IsString() subject: string;
  @IsString() body: string;
  @IsEnum(TicketCategory) @IsOptional() category?: TicketCategory;
  @IsEnum(TicketPriority) @IsOptional() priority?: TicketPriority;
  @IsArray() @IsString({ each: true }) @IsOptional() attachmentUrls?: string[];
}

export class AddTicketMessageDto {
  @IsString() body: string;
  @IsOptional() isInternal?: boolean;
}

export class ResolveTicketDto {
  @IsString() @IsOptional() resolutionNote?: string;
}

export class AssignTicketDto {
  @IsString() assignedTo: string;
}
