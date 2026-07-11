import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AttendanceStatus } from '@shared/enums/attendance-status.enum';

export class CreateAttendanceDto {
  /** Student profile ObjectId being marked. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Session ObjectId this attendance belongs to (optional — walkin tracking). */
  @IsOptional()
  @IsString()
  sessionId?: string;

  /** Circle/group ObjectId — denormalised for reporting. */
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  /** ISO-8601 date of the attendance record (defaults to today). */
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  checkedInAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
