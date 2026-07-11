import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AssignmentType } from '@shared/enums/exam-assignment.enum';

export class CreateAssignmentDto {
  /** Student profile ObjectId to assign this task to. */
  @IsString()
  @IsNotEmpty()
  studentId: string;

  /** Circle/group ObjectId (optional — task may span a whole circle). */
  @IsOptional()
  @IsString()
  groupId?: string;

  /** Task nature: homework / revision_task / memorization_task. */
  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** ISO-8601 due date (optional). */
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
