import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

/**
 * Bulk attendance creation — send all (session, student[]) records in a
 * single request so a sheikh can mark an entire circle at once.
 */
export class BulkCreateAttendanceDto {
  /** Session ObjectId shared by all entries in this bulk request. */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /** Circle/group ObjectId shared by all entries. */
  @IsOptional()
  @IsString()
  groupId?: string;

  /** ISO-8601 date shared by all entries (defaults to today). */
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  records: CreateAttendanceDto[];
}
